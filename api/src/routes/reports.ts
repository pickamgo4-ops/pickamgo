import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendEmailDirect, buildBaseHtml } from '../services/email'

const router = Router()

const reportCategories = [
  'FRAUD', 'PAYMENT_ISSUE', 'WRONG_PRODUCT', 'HARASSMENT',
  'FAKE_SHOP', 'ORDER_PROBLEM', 'DELIVERY_PROBLEM', 'SUSPICIOUS_ACTIVITY', 'OTHER'
] as const

const targetTypes = [
  'PRODUCT', 'SHOP', 'SELLER', 'ORDER', 'CUSTOMER', 'RIDER', 'MESSAGE', 'PAYMENT', 'USER', 'OTHER'
] as const

const reportStatuses = ['NEW', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const

const submitReportSchema = z.object({
  category: z.enum(reportCategories),
  targetType: z.enum(targetTypes),
  targetId: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().optional(),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
})

const updateReportSchema = z.object({
  status: z.enum(reportStatuses).optional(),
  adminNotes: z.string().optional(),
})

const listReportsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(reportStatuses).optional(),
  category: z.enum(reportCategories).optional(),
  targetType: z.enum(targetTypes).optional(),
})

router.post('/', authMiddleware, validateBody(submitReportSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { category, targetType, targetId, reason, description, attachmentUrl } = req.body

    const recentReport = await prisma.report.findFirst({
      where: {
        reporterId: req.user!.id,
        targetType,
        targetId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (recentReport) {
      return errorResponse(res, 'You have already reported this item recently. Please wait 24 hours before submitting another report.', 429)
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        category,
        targetType,
        targetId,
        reason,
        description: description || null,
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    })

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      sendEmailDirect({
        to: adminEmail,
        subject: `New Report: ${category} - ${targetType}`,
        html: buildBaseHtml('New Report Submitted', `
          <h2>New Report Submitted</h2>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Target Type:</strong> ${targetType}</p>
          <p><strong>Target ID:</strong> ${targetId}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
          <p><strong>Reported by:</strong> ${report.reporter.name} (${report.reporter.email})</p>
          <p><strong>Report ID:</strong> ${report.id}</p>
          <a href="${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reports" class="button">View Reports</a>
        `),
        text: `New report submitted: ${category} - ${targetType}. Reason: ${reason}. Reported by: ${report.reporter.name}`,
      }).catch(() => {})
    }

    return successResponse(res, report, 201, 'Report submitted successfully. Our team will review it.')
  } catch (error) {
    console.error('Failed to submit report:', error)
    return errorResponse(res, 'Failed to submit report', 500)
  }
})

router.get('/my-reports', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined

    const where: any = { reporterId: req.user!.id }
    if (status) where.status = status

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ])

    return successResponse(res, {
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch reports', 500)
  }
})

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const query = listReportsSchema.parse(req.query)
    const where: any = {}
    if (query.status) where.status = query.status
    if (query.category) where.category = query.category
    if (query.targetType) where.targetType = query.targetType

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.report.count({ where }),
    ])

    return successResponse(res, {
      reports,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    })
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return errorResponse(res, 'Failed to fetch reports', 500)
  }
})

router.patch('/:id/status', authMiddleware, validateBody(updateReportSchema), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const { id } = req.params
    const { status, adminNotes } = req.body

    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) return errorResponse(res, 'Report not found', 404)

    const updateData: any = {}
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = req.user!.id
    }

    const updated = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    })

    if ((status === 'RESOLVED' || status === 'DISMISSED') && report.reporterId) {
      const reporter = await prisma.user.findUnique({
        where: { id: report.reporterId },
        select: { email: true, name: true },
      })

      if (reporter?.email) {
        const statusText = status === 'RESOLVED' ? 'resolved' : 'dismissed'
        sendEmailDirect({
          to: reporter.email,
          subject: `Your report has been ${statusText}`,
          html: buildBaseHtml('Report Update', `
            <h2>Report Update</h2>
            <p>Hi ${reporter.name},</p>
            <p>Your report (ID: ${report.id}) has been marked as <strong>${statusText}</strong>.</p>
            <p>Thank you for helping us keep PickAmGo safe.</p>
          `),
          text: `Hi ${reporter.name}, your report (ID: ${report.id}) has been marked as ${statusText}. Thank you for helping us keep PickAmGo safe.`,
        }).catch(() => {})
      }
    }

    return successResponse(res, updated, undefined, 'Report updated successfully')
  } catch (error) {
    console.error('Failed to update report:', error)
    return errorResponse(res, 'Failed to update report', 500)
  }
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    })

    if (!report) return errorResponse(res, 'Report not found', 404)

    const isAdmin = req.user!.isAdmin
    const isReporter = report.reporterId === req.user!.id

    if (!isAdmin && !isReporter) {
      return errorResponse(res, 'Not authorized', 403)
    }

    if (!isAdmin) {
      const { adminNotes, resolvedBy, ...publicReport } = report
      return successResponse(res, publicReport)
    }

    return successResponse(res, report)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch report', 500)
  }
})

export default router
