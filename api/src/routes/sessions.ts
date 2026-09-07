import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { errorResponse, successResponse, validateBody } from '../types/express'
import {
  buildSessionMeta,
  createUserSession,
  listUserSessions,
  recordSessionAnomaly,
  revokeAllSessions,
  revokeSessionByToken,
  touchSession,
} from '../utils/sessions'
import prisma from '../utils/prisma'
import { getRequestIp } from '../middleware/rate-limit'

const router = Router()

router.get('/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const sessions = await listUserSessions(req.user!.id)
  return successResponse(res, sessions.map(session => ({
    id: session.id,
    device: session.device,
    browser: session.browser,
    os: session.os,
    ipAddress: session.ipAddress,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
    revokedAt: session.revokedAt,
    revokedReason: session.revokedReason,
    isCurrent: session.isCurrent,
  })))
})

const revokeSchema = z.object({ sessionId: z.string().min(1) })

router.post('/sessions/revoke', authMiddleware, validateBody(revokeSchema), async (req: AuthenticatedRequest, res) => {
  const session = await prisma.userSession.findFirst({ where: { id: req.body.sessionId, userId: req.user!.id } })
  if (!session) return errorResponse(res, 'Session not found', 404)
  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date(), revokedReason: 'USER_REVOKED', isCurrent: false },
  })
  return successResponse(res, null, 200, 'Session revoked')
})

router.post('/sessions/revoke-others', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const authHeader = (req as any).headers?.authorization as string | undefined
  const currentToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  let exceptSessionId: string | undefined
  if (currentToken) {
    const session = await prisma.userSession.findUnique({ where: { sessionToken: currentToken } }).catch(() => null)
    if (session && session.userId === req.user!.id) exceptSessionId = session.id
  }
  await revokeAllSessions(req.user!.id, exceptSessionId, 'USER_REVOKED_OTHERS')
  return successResponse(res, null, 200, 'Other sessions signed out')
})

router.post('/sessions/register', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const meta = buildSessionMeta(req as any)
  const authHeader = (req as any).headers?.authorization as string | undefined
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return errorResponse(res, 'Unable to register session', 400)

  const knownIps = await prisma.userSession.findMany({
    where: { userId: req.user!.id, revokedAt: null },
    select: { ipAddress: true },
    distinct: ['ipAddress'],
  })
  const isNewLocation = !knownIps.some(record => record.ipAddress === meta.ipAddress)

  await createUserSession(req.user!.id, meta)
  if (isNewLocation && knownIps.length > 0) {
    await recordSessionAnomaly(req.user!.id, meta, 'Sign-in from a new IP address')
  }
  return successResponse(res, { ipAddress: meta.ipAddress }, 200, 'Session registered')
})

router.post('/sessions/touch', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const authHeader = (req as any).headers?.authorization as string | undefined
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  await touchSession(req.user!.id, token)
  return successResponse(res, null, 200)
})

export default router