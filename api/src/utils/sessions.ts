import crypto from 'crypto'
import prisma from './prisma'
import { createAuditEntry } from './auditLog'
import { getRequestIp } from '../middleware/rate-limit'

interface SessionMeta {
  ipAddress: string
  userAgent: string | null
  device?: string | null
  browser?: string | null
  os?: string | null
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function parseUserAgent(userAgent?: string | null) {
  if (!userAgent) return { device: null, browser: null, os: null }
  let device: string | null = null
  if (/mobile|android|iphone|ipod/i.test(userAgent)) {
    device = /ipad|tablet/i.test(userAgent) ? 'tablet' : 'mobile'
  } else if (/ipad|tablet/i.test(userAgent)) {
    device = 'tablet'
  } else {
    device = 'desktop'
  }
  let browser: string | null = null
  if (/edg\//i.test(userAgent)) browser = 'Edge'
  else if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) browser = 'Opera'
  else if (/chrome/i.test(userAgent) && !/edg|opr/i.test(userAgent)) browser = 'Chrome'
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari'
  else if (/firefox/i.test(userAgent)) browser = 'Firefox'

  let os: string | null = null
  if (/windows/i.test(userAgent)) os = 'Windows'
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS'
  else if (/android/i.test(userAgent)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS'
  else if (/linux/i.test(userAgent)) os = 'Linux'

  return { device, browser, os }
}

export async function createUserSession(userId: string, meta: SessionMeta) {
  const token = crypto.randomBytes(32).toString('hex')
  const parsed = parseUserAgent(meta.userAgent)
  const session = await prisma.userSession.create({
    data: {
      userId,
      sessionToken: hashToken(token),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      device: meta.device ?? parsed.device,
      browser: meta.browser ?? parsed.browser,
      os: meta.os ?? parsed.os,
    },
  })

  await prisma.userSession.updateMany({
    where: { userId, id: { not: session.id } },
    data: { isCurrent: false },
  })
  await prisma.userSession.update({ where: { id: session.id }, data: { isCurrent: true } })

  return { token, session }
}

export async function revokeSessionByToken(userId: string, token: string, reason = 'USER_LOGOUT') {
  const tokenHash = hashToken(token)
  const session = await prisma.userSession.findUnique({ where: { sessionToken: tokenHash } })
  if (!session || session.userId !== userId) return false
  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date(), revokedReason: reason, isCurrent: false },
  })
  return true
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string, reason = 'USER_LOGOUT_OTHERS') {
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date(), revokedReason: reason, isCurrent: false },
  })
  await prisma.user.update({ where: { id: userId }, data: { authVersion: { increment: 1 } } })
}

export async function touchSession(userId: string, token: string | null) {
  if (!token) return
  try {
    await prisma.userSession.update({
      where: { sessionToken: hashToken(token) },
      data: { lastActiveAt: new Date() },
    })
  } catch {
    // Token may not yet be associated with a session (e.g., first request after login).
  }
}

export async function listUserSessions(userId: string) {
  return prisma.userSession.findMany({
    where: { userId },
    orderBy: [{ revokedAt: 'asc' }, { lastActiveAt: 'desc' }],
    take: 50,
  })
}

export function buildSessionMeta(req: { ip?: string; headers: Record<string, any> }): SessionMeta {
  const userAgent = (req.headers?.['user-agent'] as string | undefined) || null
  const ipAddress = getRequestIp(req as any) || 'unknown'
  return { ipAddress, userAgent }
}

export async function recordSessionAnomaly(userId: string, meta: SessionMeta, reason: string) {
  await createAuditEntry({
    actorId: userId,
    actorRole: 'USER',
    action: 'SESSION_ANOMALY',
    targetType: 'USER_SESSION',
    targetId: userId,
    reason,
    metadata: JSON.stringify({ ipAddress: meta.ipAddress, userAgent: meta.userAgent }),
  })
}