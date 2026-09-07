import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { errorResponse, successResponse, validateBody } from '../types/express'
import prisma from '../utils/prisma'
import { invalidateKillSwitchCache } from '../utils/killSwitch'
import { invalidateRestrictionCache } from '../utils/accountRestrictions'
import { createAuditEntry } from '../utils/auditLog'

const router = Router()

const killSwitchKeys = [
  'sellerRegistration',
  'riderRegistration',
  'payouts',
  'promoCodes',
  'messaging',
  'checkout',
  'maintenance',
] as const

router.get('/kill-switches', authMiddleware, requireRole(['ADMIN']), async (_req: AuthenticatedRequest, res) => {
  const records = await prisma.systemKillSwitch.findMany()
  const map = new Map(records.map(r => [r.key, r]))
  return successResponse(res, killSwitchKeys.map(key => {
    const record = map.get(key)
    return {
      key,
      enabled: Boolean(record?.enabled),
      reason: record?.reason || null,
      enabledAt: record?.enabledAt || null,
      enabledBy: record?.enabledBy || null,
      disabledAt: record?.disabledAt || null,
      disabledBy: record?.disabledBy || null,
      updatedAt: record?.updatedAt || null,
    }
  }))
})

const killSwitchSchema = z.object({
  key: z.enum(killSwitchKeys),
  enabled: z.boolean(),
  reason: z.string().min(3).max(500).optional(),
})

router.patch('/kill-switches', authMiddleware, requireRole(['ADMIN']), validateBody(killSwitchSchema), async (req: AuthenticatedRequest, res) => {
  const { key, enabled, reason } = req.body
  const now = new Date()
  const updated = await prisma.systemKillSwitch.upsert({
    where: { key },
    create: {
      key,
      enabled,
      reason: reason || null,
      enabledBy: enabled ? req.user!.id : null,
      enabledAt: enabled ? now : null,
      disabledBy: enabled ? null : req.user!.id,
      disabledAt: enabled ? null : now,
      updatedAt: now,
    },
    update: {
      enabled,
      reason: reason ?? null,
      enabledBy: enabled ? req.user!.id : null,
      enabledAt: enabled ? now : null,
      disabledBy: enabled ? null : req.user!.id,
      disabledAt: enabled ? null : now,
      updatedAt: now,
    },
  })

  invalidateKillSwitchCache(key)

  await createAuditEntry({
    actorId: req.user!.id,
    actorRole: 'ADMIN',
    action: enabled ? 'KILL_SWITCH_ENABLED' : 'KILL_SWITCH_DISABLED',
    targetType: 'SystemKillSwitch',
    targetId: key,
    reason: reason || null,
  })

  return successResponse(res, updated, 200, enabled ? 'Kill switch activated' : 'Kill switch deactivated')
})

const restrictionSchema = z.object({
  userId: z.string().min(1),
  capability: z.enum(['messaging', 'selling', 'payouts', 'checkout', 'riders', 'reviews', 'logins']),
  status: z.enum(['ACTIVE', 'RESTRICTED']).default('RESTRICTED'),
  reason: z.string().min(3).max(500).optional(),
  expiresAt: z.string().datetime().optional(),
})

router.post('/restrictions', authMiddleware, requireRole(['ADMIN']), validateBody(restrictionSchema), async (req: AuthenticatedRequest, res) => {
  const { userId, capability, status, reason, expiresAt } = req.body
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return errorResponse(res, 'User not found', 404)

  const record = await prisma.accountRestriction.upsert({
    where: { userId_capability: { userId, capability } },
    create: {
      userId,
      capability,
      status,
      reason: reason || null,
      createdBy: req.user!.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    update: {
      status,
      reason: reason || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  invalidateRestrictionCache(userId)

  await createAuditEntry({
    actorId: req.user!.id,
    actorRole: 'ADMIN',
    action: status === 'ACTIVE' ? 'ACCOUNT_RESTRICTION_LIFTED' : 'ACCOUNT_RESTRICTION_APPLIED',
    targetType: 'User',
    targetId: userId,
    reason: reason || null,
    metadata: JSON.stringify({ capability, expiresAt }),
  })

  return successResponse(res, record, 200, status === 'ACTIVE' ? 'Restriction removed' : 'Restriction applied')
})

router.delete('/restrictions/:userId/:capability', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const { userId, capability } = req.params
  try {
    await prisma.accountRestriction.delete({ where: { userId_capability: { userId, capability } } })
    invalidateRestrictionCache(userId)
    await createAuditEntry({
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      action: 'ACCOUNT_RESTRICTION_LIFTED',
      targetType: 'User',
      targetId: userId,
      metadata: JSON.stringify({ capability }),
    })
  } catch {
    return errorResponse(res, 'Restriction not found', 404)
  }
  return successResponse(res, null, 200, 'Restriction removed')
})

router.get('/restrictions/:userId', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const records = await prisma.accountRestriction.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: 'desc' },
  })
  return successResponse(res, records)
})

router.get('/fraud-alerts', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 25
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const riskLevel = typeof req.query.riskLevel === 'string' ? req.query.riskLevel : undefined

  const where: any = {}
  if (status) where.status = status
  if (riskLevel) where.riskLevel = riskLevel

  const [alerts, total] = await Promise.all([
    prisma.fraudAlert.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { id: true, orderNumber: true, total: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fraudAlert.count({ where }),
  ])

  return successResponse(res, {
    alerts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

const fraudAlertUpdateSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']),
  notes: z.string().max(2000).optional(),
})

router.patch('/fraud-alerts/:id', authMiddleware, requireRole(['ADMIN']), validateBody(fraudAlertUpdateSchema), async (req: AuthenticatedRequest, res) => {
  const alert = await prisma.fraudAlert.findUnique({ where: { id: req.params.id } })
  if (!alert) return errorResponse(res, 'Alert not found', 404)

  const updated = await prisma.fraudAlert.update({
    where: { id: alert.id },
    data: { status: req.body.status, metadata: req.body.notes ? JSON.stringify({ ...(alert.metadata ? safeParse(alert.metadata) : {}), adminNotes: req.body.notes }) : alert.metadata },
  })

  await createAuditEntry({
    actorId: req.user!.id,
    actorRole: 'ADMIN',
    action: 'FRAUD_ALERT_REVIEWED',
    targetType: 'FraudAlert',
    targetId: alert.id,
    reason: req.body.notes || req.body.status,
    metadata: JSON.stringify({ previousStatus: alert.status, newStatus: req.body.status }),
  })

  return successResponse(res, updated, 200, 'Fraud alert updated')
})

function safeParse(value: string): Record<string, unknown> {
  try { return JSON.parse(value) } catch { return {} }
}

export default router