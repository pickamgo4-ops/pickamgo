import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { getAppUrl } from '../utils/url'

const router = Router()

const noticeTypeSchema = z.enum([
  'INFORMATION',
  'SUCCESS',
  'WARNING',
  'IMPORTANT',
  'MAINTENANCE',
  'PROMOTION',
  'UPDATE',
  'CUSTOM',
])

const noticeStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'])

const pageTargetOptions = [
  'ALL', 'HOME', 'SEARCH', 'CATEGORY', 'PRODUCT', 'SHOP', 'CART', 'CHECKOUT',
  'ORDERS', 'BOOKINGS', 'SELLER', 'RIDER', 'ACCOUNT', 'AUTH', 'DISCOVER',
  'TRACK', 'MESSAGES', 'REPORT', 'SETTINGS', 'HELP', 'SECURITY', 'PRIVACY', 'TERMS',
] as const

const audienceOptions = ['EVERYONE', 'BUYERS', 'SELLERS', 'RIDERS', 'ADMINS', 'GUESTS'] as const

const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  type: z.enum(['INFORMATION', 'SUCCESS', 'WARNING', 'IMPORTANT', 'MAINTENANCE', 'PROMOTION', 'UPDATE', 'CUSTOM']).default('INFORMATION'),
  icon: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  buttonText: z.string().max(100).optional().or(z.literal('')),
  buttonUrl: z.string().url('Invalid button URL').optional().or(z.literal('')),
  linkTarget: z.enum(['_self', '_blank']).default('_self'),
  pageTargets: z.array(z.enum(pageTargetOptions)).default(['ALL']),
  audience: z.enum(audienceOptions).default('EVERYONE'),
  priority: z.number().int().min(0).max(100).default(0),
  isDismissible: z.boolean().default(true),
  rememberDismissal: z.boolean().default(true),
  reappearAfterHours: z.number().int().min(0).optional(),
  startsAt: z.string().datetime().optional().or(z.literal('')),
  endsAt: z.string().datetime().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED']).default('DRAFT'),
})

const updateNoticeSchema = createNoticeSchema.partial().extend({
  publishedAt: z.string().datetime().optional().or(z.literal('')),
  archivedAt: z.string().datetime().optional().or(z.literal('')),
})

function sanitizeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isValidUrl(value: string | undefined | null): boolean {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeNoticeInput(input: z.infer<typeof createNoticeSchema>) {
  const data: any = {
    ...input,
    message: sanitizeHtml(input.message),
    title: sanitizeHtml(input.title),
    imageUrl: input.imageUrl || null,
    buttonText: input.buttonText || null,
    buttonUrl: input.buttonUrl || null,
    icon: input.icon || null,
    pageTargets: input.pageTargets.join(','),
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    reappearAfterHours: input.reappearAfterHours ?? 24,
  }

  if (input.status === 'PUBLISHED' && !data.publishedAt) {
    data.publishedAt = new Date()
  }

  return data
}

router.get('/', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const search = String(req.query.search || '').trim()
    const type = String(req.query.type || '').trim()
    const status = String(req.query.status || '').trim()
    const pageTarget = String(req.query.pageTarget || '').trim()

    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type) where.type = type
    if (status) where.status = status
    if (pageTarget) where.pageTargets = { contains: pageTarget }

    const total = await prisma.publicNotice.count({ where })
    const notices = await prisma.publicNotice.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    const mapped = notices.map(notice => ({
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    }))

    return successResponse(res, {
      notices: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error('Failed to fetch public notices:', error)
    return errorResponse(res, 'Failed to fetch public notices', 500)
  }
})

router.get('/public', async (_req, res) => {
  try {
    const appUrl = getAppUrl()
    const now = new Date()

    const notices = await prisma.publicNotice.findMany({
      where: {
        status: 'PUBLISHED',
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    const mapped = notices.map(notice => ({
      id: notice.id,
      title: notice.title,
      message: notice.message,
      type: notice.type,
      icon: notice.icon,
      imageUrl: notice.imageUrl,
      buttonText: notice.buttonText,
      buttonUrl: notice.buttonUrl,
      linkTarget: notice.linkTarget,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
      audience: notice.audience,
      priority: notice.priority,
      isDismissible: notice.isDismissible,
      rememberDismissal: notice.rememberDismissal,
      reappearAfterHours: notice.reappearAfterHours,
      status: notice.status,
      startsAt: notice.startsAt,
      endsAt: notice.endsAt,
      createdAt: notice.createdAt,
    }))

    return successResponse(res, { notices: mapped, appUrl })
  } catch (error) {
    console.error('Failed to fetch public notices:', error)
    return errorResponse(res, 'Failed to fetch public notices', 500)
  }
})

router.get('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const notice = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!notice) {
      return errorResponse(res, 'Public notice not found', 404)
    }

    return successResponse(res, {
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    })
  } catch (error) {
    console.error('Failed to fetch public notice:', error)
    return errorResponse(res, 'Failed to fetch public notice', 500)
  }
})

router.post('/', authMiddleware, requireRole(['ADMIN']), validateBody(createNoticeSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const data = normalizeNoticeInput(req.body)
    data.createdBy = req.user!.id

    const notice = await prisma.publicNotice.create({
      data,
    })

    return successResponse(res, {
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    }, 201, 'Public notice created successfully')
  } catch (error) {
    console.error('Failed to create public notice:', error)
    return errorResponse(res, 'Failed to create public notice', 500)
  }
})

router.patch('/:id', authMiddleware, requireRole(['ADMIN']), validateBody(updateNoticeSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      return errorResponse(res, 'Public notice not found', 404)
    }

    const data = normalizeNoticeInput(req.body)

    if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      data.publishedAt = new Date()
    }

    if (data.status === 'ARCHIVED' && existing.status !== 'ARCHIVED') {
      data.archivedAt = new Date()
    }

    const notice = await prisma.publicNotice.update({
      where: { id: req.params.id },
      data,
    })

    return successResponse(res, {
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    }, 200, 'Public notice updated successfully')
  } catch (error) {
    console.error('Failed to update public notice:', error)
    return errorResponse(res, 'Failed to update public notice', 500)
  }
})

router.post('/:id/publish', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      return errorResponse(res, 'Public notice not found', 404)
    }

    const notice = await prisma.publicNotice.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    })

    return successResponse(res, {
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    }, 200, 'Public notice published successfully')
  } catch (error) {
    console.error('Failed to publish public notice:', error)
    return errorResponse(res, 'Failed to publish public notice', 500)
  }
})

router.post('/:id/unpublish', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      return errorResponse(res, 'Public notice not found', 404)
    }

    const notice = await prisma.publicNotice.update({
      where: { id: req.params.id },
      data: {
        status: 'DRAFT',
      },
    })

    return successResponse(res, {
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    }, 200, 'Public notice unpublished successfully')
  } catch (error) {
    console.error('Failed to unpublish public notice:', error)
    return errorResponse(res, 'Failed to unpublish public notice', 500)
  }
})

router.post('/:id/archive', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      return errorResponse(res, 'Public notice not found', 404)
    }

    const notice = await prisma.publicNotice.update({
      where: { id: req.params.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    })

    return successResponse(res, {
      ...notice,
      pageTargets: notice.pageTargets.split(',').filter(Boolean),
    }, 200, 'Public notice archived successfully')
  } catch (error) {
    console.error('Failed to archive public notice:', error)
    return errorResponse(res, 'Failed to archive public notice', 500)
  }
})

router.delete('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      return errorResponse(res, 'Public notice not found', 404)
    }

    await prisma.publicNotice.delete({
      where: { id: req.params.id },
    })

    return successResponse(res, null, 200, 'Public notice deleted successfully')
  } catch (error) {
    console.error('Failed to delete public notice:', error)
    return errorResponse(res, 'Failed to delete public notice', 500)
  }
})

router.post('/:id/dismiss', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const notice = await prisma.publicNotice.findUnique({
      where: { id: req.params.id },
    })

    if (!notice || !notice.isDismissible) {
      return errorResponse(res, 'Public notice not found or not dismissible', 404)
    }

    const userId = req.user?.id
    const sessionId = (req as any).headers?.['x-session-id'] as string | undefined

    if (!userId && !sessionId) {
      return errorResponse(res, 'User or session ID is required', 400)
    }

    if (userId) {
      await prisma.publicNoticeDismissal.upsert({
        where: {
          noticeId_userId: {
            noticeId: req.params.id,
            userId,
          },
        },
        update: { dismissedAt: new Date() },
        create: {
          noticeId: req.params.id,
          userId,
        },
      })
    } else if (sessionId) {
      await prisma.publicNoticeDismissal.upsert({
        where: {
          noticeId_sessionId: {
            noticeId: req.params.id,
            sessionId,
          },
        },
        update: { dismissedAt: new Date() },
        create: {
          noticeId: req.params.id,
          sessionId,
        },
      })
    }

    return successResponse(res, null, 200, 'Public notice dismissed')
  } catch (error) {
    console.error('Failed to dismiss public notice:', error)
    return errorResponse(res, 'Failed to dismiss public notice', 500)
  }
})

router.get('/dismissals', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dismissals = await prisma.publicNoticeDismissal.findMany({
      where: { userId: req.user!.id },
      orderBy: { dismissedAt: 'desc' },
    })

    return successResponse(res, { dismissals })
  } catch (error) {
    console.error('Failed to fetch public notice dismissals:', error)
    return errorResponse(res, 'Failed to fetch public notice dismissals', 500)
  }
})

export default router
