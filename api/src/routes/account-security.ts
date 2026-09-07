import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, restrictedAccountAuthMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'

const router = Router()

const appealSchema = z.object({ reason: z.string().min(20).max(4000) })
const reviewSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'REJECTED']),
  decision: z.string().min(1).max(2000),
  restoreAccount: z.boolean().default(false),
})

router.post('/appeals', restrictedAccountAuthMiddleware, validateBody(appealSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.accountAppeal.findFirst({ where: { userId: req.user!.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } })
    if (existing) return errorResponse(res, 'You already have an appeal under review', 409)

    const appeal = await prisma.$transaction(async tx => {
      const created = await tx.accountAppeal.create({ data: { userId: req.user!.id, reason: req.body.reason } })
      await tx.auditLog.create({ data: { actorId: req.user!.id, actorRole: 'USER', action: 'ACCOUNT_APPEAL_CREATED', targetType: 'ACCOUNT_APPEAL', targetId: created.id } })
      return created
    })
    return successResponse(res, appeal, 201, 'Appeal submitted for review')
  } catch {
    return errorResponse(res, 'Failed to submit account appeal', 500)
  }
})

router.get('/appeals', restrictedAccountAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  const appeals = await prisma.accountAppeal.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })
  return successResponse(res, appeals)
})

router.get('/admin/appeals', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const appeals = await prisma.accountAppeal.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, name: true, email: true, isSeller: true, isRider: true, suspended: true, banned: true, accountStatus: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return successResponse(res, appeals)
})

router.patch('/admin/appeals/:id', authMiddleware, requireRole(['ADMIN']), validateBody(reviewSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const appeal = await prisma.accountAppeal.findUnique({ where: { id: req.params.id } })
    if (!appeal) return errorResponse(res, 'Appeal not found', 404)
    if (appeal.status === 'RESOLVED' || appeal.status === 'REJECTED') return errorResponse(res, 'Appeal has already been decided', 409)

    const reviewed = await prisma.$transaction(async tx => {
      const next = await tx.accountAppeal.update({ where: { id: appeal.id }, data: { status: req.body.status, decision: req.body.decision, reviewedBy: req.user!.id, reviewedAt: new Date() } })
      if (req.body.restoreAccount && req.body.status === 'RESOLVED') {
        await tx.user.update({ where: { id: appeal.userId }, data: { suspended: false, banned: false, accountStatus: 'ACTIVE', restrictionReason: null, statusChangedAt: new Date(), authVersion: { increment: 1 } } })
      }
      await tx.auditLog.create({ data: { actorId: req.user!.id, actorRole: 'ADMIN', action: 'ACCOUNT_APPEAL_REVIEWED', targetType: 'ACCOUNT_APPEAL', targetId: appeal.id, reason: req.body.decision, metadata: JSON.stringify({ restoreAccount: req.body.restoreAccount, userId: appeal.userId }) } })
      return next
    })
    return successResponse(res, reviewed, undefined, 'Appeal reviewed')
  } catch {
    return errorResponse(res, 'Failed to review account appeal', 500)
  }
})

export default router