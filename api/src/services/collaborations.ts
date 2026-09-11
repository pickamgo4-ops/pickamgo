import prisma from '../utils/prisma'
import { Prisma } from '@prisma/client'
import { resolveProductPrice } from './product-pricing'
import { getPlatformCommissionRate } from './earnings'

export const collaborationStatuses = ['DRAFT', 'INVITED', 'PENDING_ACCEPTANCE', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED', 'COMPLETED'] as const
export const collaborationTypes = ['BUNDLE', 'COLLECTION', 'CAMPAIGN'] as const

export type CollaborationMoneyLine = {
  collaborationProductId: string
  productId: string
  variantId: string | null
  shopId: string
  sellerId: string
  quantity: number
  eligibleUnitPrice: number
}

function cents(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Invalid monetary value')
  return Math.round(value * 100)
}

function fromCents(value: number): number {
  return Math.round(value) / 100
}

export function allocateProportionally(total: number, lines: Array<{ key: string; baseCents: number }>): Map<string, number> {
  const totalCents = cents(total)
  const baseTotal = lines.reduce((sum, line) => sum + line.baseCents, 0)
  if (totalCents < 0 || baseTotal <= 0) throw new Error('Unable to allocate collaboration price')
  const allocations = new Map<string, number>()
  let assigned = 0
  lines.forEach((line, index) => {
    const value = index === lines.length - 1 ? totalCents - assigned : Math.floor(totalCents * line.baseCents / baseTotal)
    allocations.set(line.key, value)
    assigned += value
  })
  return allocations
}

export async function getCollaborationLines(collaborationId: string, client: typeof prisma | Prisma.TransactionClient = prisma): Promise<CollaborationMoneyLine[]> {
  const collaboration = await client.collaboration.findUnique({
    where: { id: collaborationId },
    include: { products: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!collaboration) throw new Error('Collaboration not found')
  const lines: CollaborationMoneyLine[] = []
  for (const item of collaboration.products) {
    const product = await client.product.findFirst({ where: { id: item.productId, shopId: item.shopId, sellerId: item.sellerId, status: 'ACTIVE', shop: { status: 'ACTIVE' } }, select: { id: true, price: true, originalPrice: true } })
    if (!product) throw new Error('A collaboration product is no longer available')
    const pricing = await resolveProductPrice({ id: product.id, price: product.price, originalPrice: product.originalPrice }, item.variantId || undefined, client)
    lines.push({ collaborationProductId: item.id, productId: item.productId, variantId: item.variantId, shopId: item.shopId, sellerId: item.sellerId, quantity: item.quantity, eligibleUnitPrice: pricing.finalPrice })
  }
  if (!lines.length) throw new Error('Collaboration has no products')
  return lines
}

export async function calculateCollaborationFinancials(collaborationId: string, client: typeof prisma | Prisma.TransactionClient = prisma) {
  const collaboration = await client.collaboration.findUnique({ where: { id: collaborationId }, select: { bundlePrice: true, type: true } })
  if (!collaboration) throw new Error('Collaboration not found')
  const lines = await getCollaborationLines(collaborationId, client)
  const normalTotal = lines.reduce((sum, line) => sum + line.eligibleUnitPrice * line.quantity, 0)
  const customerSubtotal = collaboration.type === 'BUNDLE' && collaboration.bundlePrice != null ? Number(collaboration.bundlePrice) : normalTotal
  if (customerSubtotal <= 0 || customerSubtotal > normalTotal) throw new Error('Bundle price must be positive and no greater than the eligible product total')
  const allocations = allocateProportionally(customerSubtotal, lines.map(line => ({ key: line.collaborationProductId, baseCents: cents(line.eligibleUnitPrice * line.quantity) })))
  const commissionRate = await getPlatformCommissionRate()
  const platformFeeCents = Math.round(cents(customerSubtotal) * commissionRate)
  const sellerPoolCents = cents(customerSubtotal) - platformFeeCents
  const sellerAllocations = allocateProportionally(fromCents(sellerPoolCents), lines.map(line => ({ key: line.collaborationProductId, baseCents: allocations.get(line.collaborationProductId) || 0 })))
  return { lines, normalTotal, customerSubtotal, commissionRate, platformFee: fromCents(platformFeeCents), allocations, sellerAllocations, sellerPool: fromCents(sellerPoolCents) }
}

export function assertCollaborationActive(collaboration: { status: string; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (collaboration.status !== 'ACTIVE') throw new Error('Collaboration is not active')
  if (collaboration.startsAt && collaboration.startsAt > now) throw new Error('Collaboration has not started')
  if (collaboration.endsAt && collaboration.endsAt < now) throw new Error('Collaboration has expired')
}

export type CollaborationRefundTarget = {
  allocationId: string
  amountCents: number
  sellerPayoutReversalCents: number
  platformFeeReversalCents: number
}

export function allocateCollaborationRefund(amount: number, allocations: Array<{ id: string; grossAmount: unknown; refundedAmount: unknown; netAmount: unknown; platformFee: unknown }>): CollaborationRefundTarget[] {
  let remainingCents = cents(amount)
  const targets: CollaborationRefundTarget[] = []
  for (const allocation of allocations) {
    if (remainingCents <= 0) break
    const capacityCents = Math.max(0, cents(Number(allocation.grossAmount) - Number(allocation.refundedAmount)))
    if (!capacityCents) continue
    const refundCents = Math.min(remainingCents, capacityCents)
    const grossCents = Math.max(1, cents(Number(allocation.grossAmount)))
    const platformFeeCents = Math.min(refundCents, Math.floor(refundCents * cents(Number(allocation.platformFee)) / grossCents))
    targets.push({ allocationId: allocation.id, amountCents: refundCents, sellerPayoutReversalCents: refundCents - platformFeeCents, platformFeeReversalCents: platformFeeCents })
    remainingCents -= refundCents
  }
  if (remainingCents > 0) throw new Error('Refund amount exceeds the remaining collaboration allocation')
  return targets
}

export async function expireCollaborations(client: typeof prisma | Prisma.TransactionClient = prisma) {
  return client.collaboration.updateMany({ where: { status: { in: ['ACTIVE', 'PAUSED'] }, endsAt: { not: null, lt: new Date() } }, data: { status: 'EXPIRED' } })
}
