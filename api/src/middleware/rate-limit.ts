import crypto from 'crypto'
import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from './auth'
import { verifyToken } from './auth'
import prisma from '../utils/prisma'
import { Prisma } from '@prisma/client'

export type RateLimitCategory = 'api' | 'read' | 'write' | 'search' | 'message' | 'payment' | 'admin' | 'auth' | 'login' | 'password-reset' | 'otp'

const DEFAULTS: Record<RateLimitCategory, { limit: number; windowMs: number }> = {
  api: { limit: 200, windowMs: 15 * 60_000 },
  read: { limit: 100, windowMs: 60_000 },
  write: { limit: 30, windowMs: 60_000 },
  search: { limit: 60, windowMs: 60_000 },
  message: { limit: 20, windowMs: 60_000 },
  payment: { limit: 5, windowMs: 10 * 60_000 },
  admin: { limit: 60, windowMs: 60_000 },
  auth: { limit: 20, windowMs: 15 * 60_000 },
  login: { limit: 5, windowMs: 15 * 60_000 },
  'password-reset': { limit: 3, windowMs: 15 * 60_000 },
  otp: { limit: 3, windowMs: 10 * 60_000 },
}

function configured(category: RateLimitCategory | string, fallback?: { limit: number; windowMs: number }) {
  const defaults = DEFAULTS[category as RateLimitCategory] || fallback || DEFAULTS.api
  const prefix = `RATE_LIMIT_${category.toUpperCase().replace('-', '_')}`
  return {
    limit: Number(process.env[`${prefix}_LIMIT`] || defaults.limit),
    windowMs: Number(process.env[`${prefix}_WINDOW_MS`] || defaults.windowMs),
  }
}

export function getRequestIp(req: AuthenticatedRequest): string {
  const request = req as any
  return request.ip || request.socket?.remoteAddress || 'unknown'
}

export function hashIdentity(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function keyFor(category: string, identity: string): string {
  return `${category}:${hashIdentity(identity)}`
}

function logBlockedRequest(category: string, req: AuthenticatedRequest, blockedCount: number) {
  const request = req as any
  console.warn(JSON.stringify({
    event: 'rate_limit_blocked',
    category,
    endpoint: `${request.method} ${request.baseUrl || request.path}`,
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    ip: getRequestIp(req),
    blockedCount,
  }))
}

async function changeBucket(key: string, windowMs: number, increment: boolean): Promise<{ count: number; windowStart: Date; now: Date }> {
  if (increment) {
    const rows = await prisma.$queryRaw<{ count: number; windowStart: Date; serverNow: Date }[]>(Prisma.sql`
      INSERT INTO "RateLimitBucket" ("id", "key", "windowStart", "count", "blockedCount", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${key}, NOW(), 1, 0, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."windowStart" <= NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" <= NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN NOW() ELSE "RateLimitBucket"."windowStart" END,
        "updatedAt" = NOW()
      RETURNING "count", "windowStart", NOW() AS "serverNow"
    `)
    return { count: rows[0].count, windowStart: rows[0].windowStart, now: rows[0].serverNow }
  }

  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date; serverNow: Date }[]>(Prisma.sql`
    SELECT "count", "windowStart", NOW() AS "serverNow"
    FROM "RateLimitBucket"
    WHERE "key" = ${key}
  `)
  if (!rows[0]) return { count: 0, windowStart: new Date(), now: new Date() }
  const row = rows[0]
  if (row.windowStart.getTime() <= row.serverNow.getTime() - windowMs) return { count: 0, windowStart: row.serverNow, now: row.serverNow }
  return { count: row.count, windowStart: row.windowStart, now: row.serverNow }
}

export async function isRateLimited(category: RateLimitCategory | string, identity: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const key = keyFor(category, identity)
    const rows = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT "count"
      FROM "RateLimitBucket"
      WHERE "key" = ${key}
        AND "windowStart" > NOW() - (${windowMs} * INTERVAL '1 millisecond')
    `)
    return (rows[0]?.count || 0) >= limit
  } catch (error) {
    console.error('Rate-limit check failed:', error)
    return false
  }
}

export async function consumeRateLimit(category: RateLimitCategory | string, identity: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    const bucket = await changeBucket(keyFor(category, identity), windowMs, true)
    const allowed = bucket.count <= limit
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart.getTime() + windowMs - bucket.now.getTime()) / 1000))
    if (!allowed) {
      await prisma.rateLimitBucket.update({ where: { key: keyFor(category, identity) }, data: { blockedCount: { increment: 1 } } })
    }
    return { allowed, retryAfter }
  } catch (error) {
    console.error('Rate-limit consume failed:', error)
    return { allowed: true, retryAfter: 0 }
  }
}

export function rateLimitMiddleware(category: RateLimitCategory, options?: { limit?: number; windowMs?: number; skipAuthenticated?: boolean }) {
  const defaults = configured(category)
  const limit = options?.limit ?? defaults.limit
  const windowMs = options?.windowMs ?? defaults.windowMs
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const request = req as any
    if (options?.skipAuthenticated && await hasVerifiedUser(req)) return next()
    const identity = `${getRequestIp(req)}:${request.method}:${request.baseUrl || request.path}`
    const result = await consumeRateLimit(category, identity, limit, windowMs)
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter))
      logBlockedRequest(category, req, 1)
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' })
    }
    next()
  }
}

export async function enforceAuthenticatedRateLimit(req: AuthenticatedRequest, res: Response, category: RateLimitCategory): Promise<boolean> {
  if (!req.user) return true
  const limits = configured(category)
  const result = await consumeRateLimit(category, `user:${req.user.id}:${category}`, limits.limit, limits.windowMs)
  if (result.allowed) return true
  res.setHeader('Retry-After', String(result.retryAfter))
  logBlockedRequest(category, req, 1)
  res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' })
  return false
}

async function hasVerifiedUser(req: AuthenticatedRequest): Promise<boolean> {
  const authorization = (req as any).headers?.authorization as string | undefined
  if (!authorization?.startsWith('Bearer ')) return false

  try {
    const payload = verifyToken(authorization.slice('Bearer '.length))
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, suspended: true, banned: true, authVersion: true },
    })
    return Boolean(user && !user.suspended && !user.banned && payload.authVersion === user.authVersion)
  } catch {
    return false
  }
}

export function categoryForRequest(req: AuthenticatedRequest): RateLimitCategory {
  const request = req as any
  if (req.user?.isAdmin || request.path.startsWith('/admin')) return 'admin'
  if (request.path.includes('message')) return 'message'
  if (request.path.includes('payment') || request.path.includes('payout') || request.path.includes('refund') || request.path.includes('checkout')) return 'payment'
  if (request.method === 'GET' || request.method === 'HEAD') return request.path.includes('search') ? 'search' : 'read'
  return 'write'
}

export { configured as getRateLimitConfig }
