import { Response } from 'express'
import jwt from 'jsonwebtoken'
import { User, UserRole } from '@prisma/client'
import prisma from '../utils/prisma'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim()

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production. Set a strong random secret before starting the API.')
    }

    const fallbackSecret = 'pickamgo-dev-secret'
    console.warn('JWT_SECRET is missing. Using a local development fallback only.')
    return fallbackSecret
  }

  if (process.env.NODE_ENV === 'production' && (
    secret.includes('change-in-production') ||
    secret.includes('pickamgo-dev-secret') ||
    secret.includes('pickamgo-production-fallback-secret') ||
    secret.length < 32
  )) {
    throw new Error('JWT_SECRET must be a long, unique secret in production. Update the environment before deployment.')
  }

  return secret
}

export interface TokenPayload {
  id: string
  email: string
  name: string
  isSeller: boolean
  isRider: boolean
  isAdmin: boolean
}

export interface AuthenticatedRequest extends Express.Request {
  user?: TokenPayload
}

export function generateToken(user: User & { roles?: UserRole[] }): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    isSeller: user.isSeller,
    isRider: user.isRider,
    isAdmin: user.isAdmin,
  }
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: Function) {
  const authHeader = (req as any).headers?.authorization as string | undefined
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, isSeller: true, isRider: true, isAdmin: true, suspended: true, banned: true },
    })
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' })
      return
    }

    if (user.suspended || user.banned) {
      res.status(403).json({ success: false, error: 'Your account is suspended or banned. Contact support for assistance.' })
      return
    }

    req.user = user
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

export async function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: Function) {
  const authHeader = (req as any).headers?.authorization as string | undefined
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, isSeller: true, isRider: true, isAdmin: true, suspended: true, banned: true },
    })
    if (user && !user.suspended && !user.banned) {
      req.user = user
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: Function) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }
    const userRoles: string[] = []
    if (req.user.isAdmin) userRoles.push('ADMIN')
    if (req.user.isSeller) userRoles.push('SELLER')
    if (req.user.isRider) userRoles.push('RIDER')
    userRoles.push('USER')

    const hasRole = allowedRoles.some(role => userRoles.includes(role))
    if (!hasRole) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
