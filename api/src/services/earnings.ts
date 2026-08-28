import prisma from '../utils/prisma'
import { Prisma } from '@prisma/client'

let cachedCommissionRate: number | null = null

export async function getPlatformCommissionRate(): Promise<number> {
  if (cachedCommissionRate !== null) return cachedCommissionRate
  const setting = await prisma.setting.findUnique({
    where: { key: 'sellerCommission' },
  })
  const rate = setting ? parseFloat(setting.value) : 0.07
  cachedCommissionRate = rate
  return rate
}

export function clearCommissionRateCache(): void {
  cachedCommissionRate = null
}

export function getMinimumPayout(): number {
  return parseFloat(process.env.MINIMUM_PAYOUT || '20')
}

export async function calculateSellerEarnings(orderId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shop: true,
      redemption: true,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  const platformFeeRate = await getPlatformCommissionRate()
  const grossAmount = Number(order.originalSubtotal || order.total)
  const platformFee = Math.round(grossAmount * platformFeeRate * 100) / 100
  const deliveryFee = Number(order.deliveryFee || 0)
  const promoDiscount = Number(order.promoDiscount || 0)

  let netAmount = grossAmount - platformFee

  if (order.redemption) {
    if (order.redemption.fundingSource === 'SELLER') {
      netAmount = Number(order.redemption.discountedSubtotal) - platformFee
    } else if (order.redemption.fundingSource === 'PICKAMGO') {
      netAmount = grossAmount - platformFee
    }
  }

  netAmount = Math.round(netAmount * 100) / 100

  return {
    grossAmount,
    platformFee,
    deliveryFee,
    netAmount,
    promoDiscount,
  }
}

export async function calculateRiderEarnings(deliveryId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const delivery = await client.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: true,
    },
  })

  if (!delivery) {
    throw new Error('Delivery not found')
  }

  const riderRate = parseFloat(process.env.RIDER_EARNING_RATE || '0.80')
  const grossAmount = Number(delivery.fee || 0)
  const platformFee = Math.round(grossAmount * (1 - riderRate) * 100) / 100
  const netAmount = Math.round(grossAmount * riderRate * 100) / 100

  return {
    grossAmount,
    platformFee,
    netAmount,
  }
}

export async function createSellerEarnings(orderId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const order = await client.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  const earnings = calculateSellerEarnings(orderId, client)
  const { grossAmount, platformFee, deliveryFee, netAmount, promoDiscount } = await earnings

  const existing = await client.sellerEarnings.findUnique({
    where: { orderId },
  })

  if (existing) {
    return existing
  }

  return client.sellerEarnings.create({
    data: {
      sellerId: order.sellerId,
      orderId: order.id,
      grossAmount,
      platformFee,
      deliveryFee,
      netAmount,
      promoDiscount,
      status: 'PENDING',
    },
  })
}

export async function createRiderEarnings(deliveryId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const delivery = await client.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true },
  })

  if (!delivery) {
    throw new Error('Delivery not found')
  }

  const earnings = calculateRiderEarnings(deliveryId, client)
  const { grossAmount, platformFee, netAmount } = await earnings

  const existing = await client.riderEarnings.findUnique({
    where: { deliveryId },
  })

  if (existing) {
    return existing
  }

  if (!delivery.riderId) {
    throw new Error('Delivery has no rider assigned')
  }

  return client.riderEarnings.create({
    data: {
      riderId: delivery.riderId,
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      grossAmount,
      platformFee,
      netAmount,
      status: 'PENDING',
    },
  })
}
