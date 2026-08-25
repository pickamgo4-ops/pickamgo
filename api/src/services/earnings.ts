import prisma from '../utils/prisma'
import { Prisma } from '@prisma/client'

const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.05')
const RIDER_EARNING_RATE = parseFloat(process.env.RIDER_EARNING_RATE || '0.80')
const MINIMUM_PAYOUT = parseFloat(process.env.MINIMUM_PAYOUT || '20')

export function getPlatformCommissionRate(): number {
  return PLATFORM_COMMISSION_RATE
}

export function getRiderEarningRate(): number {
  return RIDER_EARNING_RATE
}

export function getMinimumPayout(): number {
  return MINIMUM_PAYOUT
}

export async function calculateSellerEarnings(orderId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shop: true,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  const platformFeeRate = getPlatformCommissionRate()
  const grossAmount = Number(order.total)
  const platformFee = Math.round(grossAmount * platformFeeRate * 100) / 100
  const deliveryFee = Number(order.deliveryFee || 0)
  const netAmount = Math.round((grossAmount - platformFee) * 100) / 100

  return {
    grossAmount,
    platformFee,
    deliveryFee,
    netAmount,
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

  const riderRate = getRiderEarningRate()
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
  const { grossAmount, platformFee, deliveryFee, netAmount } = await earnings

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
