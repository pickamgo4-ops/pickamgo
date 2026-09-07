import { Prisma } from '@prisma/client'
import prisma from './prisma'

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

export type IdempotentResult<T> =
  | { status: 'replayed'; response: T; statusCode: number }
  | { status: 'in_progress' }
  | { status: 'fresh' }

export interface IdempotentOptions {
  scope: string
  userId?: string | null
  ttlMs?: number
}

export async function beginIdempotentRequest<T>(key: string, options: IdempotentOptions): Promise<IdempotentResult<T>> {
  if (!key) return { status: 'fresh' }

  const ttl = options.ttlMs ?? IDEMPOTENCY_TTL_MS
  const expiresAt = new Date(Date.now() + ttl)

  try {
    await prisma.idempotencyRecord.create({
      data: { key, scope: options.scope, userId: options.userId ?? null, status: 'PROCESSING', expiresAt },
    })
    return { status: 'fresh' }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      console.error('Idempotency lookup failed:', error)
      return { status: 'fresh' }
    }

    const existing = await prisma.idempotencyRecord.findUnique({ where: { key } })
    if (!existing) return { status: 'fresh' }

    if (existing.expiresAt <= new Date()) {
      await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {})
      return beginIdempotentRequest(key, options)
    }

    if (existing.status === 'COMPLETED' && existing.response) {
      try {
        const parsed = JSON.parse(existing.response) as T
        return { status: 'replayed', response: parsed, statusCode: existing.statusCode ?? 200 }
      } catch {
        return { status: 'in_progress' }
      }
    }

    return { status: 'in_progress' }
  }
}

export async function completeIdempotentRequest<T>(key: string, response: T, statusCode = 200) {
  if (!key) return
  try {
    await prisma.idempotencyRecord.update({
      where: { key },
      data: {
        status: 'COMPLETED',
        response: JSON.stringify(response),
        statusCode,
        completedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to mark idempotency complete:', error)
  }
}

export async function failIdempotentRequest(key: string) {
  if (!key) return
  try {
    await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {})
  } catch {}
}

export function getIdempotencyKey(req: { headers: Record<string, any> }, fallback?: string): string | null {
  const headerKey = req.headers?.['idempotency-key']
  const value = typeof headerKey === 'string' ? headerKey.trim() : ''
  if (!value) return fallback ?? null
  if (value.length > 200) return null
  return value
}