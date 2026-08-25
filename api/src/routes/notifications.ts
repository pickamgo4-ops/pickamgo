import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const unreadOnly = req.query.unreadOnly === 'true'

  const where: any = { userId: req.user!.id }
  if (unreadOnly) where.isRead = false

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ])

  return successResponse(res, {
    notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

router.patch('/:id/read', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  })

  if (!notification) return errorResponse(res, 'Notification not found', 404)

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  })

  return successResponse(res, updated, undefined, 'Notification marked as read')
})

router.patch('/read-all', authMiddleware, async (req: AuthenticatedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  })

  return successResponse(res, null, undefined, 'All notifications marked as read')
})

router.post('/preferences', authMiddleware, validateBody(z.object({
  orderUpdates: z.boolean().optional(),
  shopUpdates: z.boolean().optional(),
  deals: z.boolean().optional(),
  delivery: z.boolean().optional(),
  beauty: z.boolean().optional(),
})), async (req: AuthenticatedRequest, res) => {
  return successResponse(res, req.body, 200, 'Notification preferences saved')
})

export default router
