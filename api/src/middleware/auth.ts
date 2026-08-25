import { Response } from 'express'
import jwt from 'jsonwebtoken'
import { User, UserRole } from '@prisma/client'
import prisma from '../utils/prisma'

const JWT_SECRET: string = process.env.JWT_SECRET || ''
if (!JWT_SECRET || (process.env.NODE_ENV === 'production' && JWT_SECRET.includes('change-in-production'))) {
  throw new Error('JWT_SECRET must be configured with a unique production secret')
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
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
      select: { id: true, email: true, name: true, isSeller: true, isRider: true, isAdmin: true },
    })
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
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
