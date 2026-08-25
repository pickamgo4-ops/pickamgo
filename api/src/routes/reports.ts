import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const reportSchema = z.object({
  targetType: z.enum(['PRODUCT', 'SHOP', 'SELLER', 'REVIEW', 'MESSAGE', 'USER']),
  targetId: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().optional(),
})

router.post('/', authMiddleware, validateBody(reportSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        targetType,
        targetId,
        reason,
        description,
      },
    })

    return successResponse(res, report, 201, 'Report submitted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to submit report', 500)
  }
})

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined

    const where: any = {}
    if (status) where.status = status

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { reporter: { select: { id: true, name: true, email: true } } },
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

router.patch('/:id/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const { id } = req.params
    const { status } = req.body

    if (!['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400)
    }

    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) return errorResponse(res, 'Report not found', 404)

    const updated = await prisma.report.update({
      where: { id },
      data: { status },
    })

    return successResponse(res, updated, undefined, 'Report status updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update report status', 500)
  }
})

export default router
