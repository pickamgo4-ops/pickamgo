import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma'

export const DEFAULT_RESERVATION_MINUTES = 30

export function isReservationActive(status: string, expiresAt: Date, now = new Date()): boolean {
  return status === 'ACTIVE' && expiresAt > now
}

export function canReserveQuantity(stock: number, reserved: number, requested: number): boolean {
  return Number.isInteger(stock) && Number.isInteger(reserved) && Number.isInteger(requested) && requested > 0 && requested <= Math.max(0, stock - reserved)
}

export async function reservationDurationMinutes(client: typeof prisma | any): Promise<number> {
  const setting = await client.setting.findUnique({ where: { key: 'reservationDurationMinutes' }, select: { value: true } })
  const minutes = Number(setting?.value)
  return Number.isInteger(minutes) && minutes >= 15 && minutes <= 60 ? minutes : DEFAULT_RESERVATION_MINUTES
}

export async function expireReservations(client: typeof prisma | any, productId?: string, userId?: string) {
  return client.productReservation.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: new Date() },
      ...(productId ? { productId } : {}),
      ...(userId ? { userId } : {}),
    },
    data: { status: 'EXPIRED' },
  })
}

export async function reservedQuantity(client: typeof prisma | any, productId: string, variantId?: string, excludeReservationId?: string): Promise<number> {
  await expireReservations(client, productId)
  const result = await client.productReservation.aggregate({
    where: {
      productId,
      variantId: variantId || null,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    _sum: { quantity: true },
  })
  return result._sum.quantity || 0
}

export async function availableQuantity(client: typeof prisma | any, productId: string, stock: number, variantId?: string, excludeReservationId?: string): Promise<number> {
  const reserved = await reservedQuantity(client, productId, variantId, excludeReservationId)
  return Math.max(0, stock - reserved)
}

export async function lockInventoryRow(client: any, productId: string, variantId?: string) {
  if (variantId) {
    await client.$queryRaw(Prisma.sql`SELECT "id" FROM "ProductVariant" WHERE "id" = ${variantId} AND "productId" = ${productId} FOR UPDATE`)
  } else {
    await client.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`)
  }
}
