import prisma from '../utils/prisma'
import { Prisma, PromoRedemption } from '@prisma/client'

export type DiscountType = 'PERCENTAGE' | 'FIXED'
export type FundingType = 'SELLER' | 'PICKAMGO'
export type PromoStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'EXHAUSTED'
export type CustomerEligibility = 'EVERYONE' | 'NEW_ONLY' | 'EXISTING_ONLY'
export type DiscountAppliesTo = 'PRODUCTS' | 'PRODUCTS_AND_DELIVERY'

export interface PromoValidationResult {
  valid: boolean
  promo?: any
  error?: string
  discountAmount: number
  deliveryDiscount: number
  discountedSubtotal: number
}

export interface PromoCalculation {
  originalSubtotal: number
  discountAmount: number
  deliveryDiscount: number
  discountedSubtotal: number
  maxDiscount: number | null
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export function isPromoActive(promo: {
  status: string
  startAt: Date
  endAt: Date
  usageLimit: number | null
  usageCount: number
  campaignBudget: Prisma.Decimal | null
  campaignSpent: Prisma.Decimal
}): boolean {
  if (promo.status !== 'ACTIVE') return false
  const now = new Date()
  if (now < promo.startAt) return false
  if (now > promo.endAt) return false
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) return false
  if (promo.campaignBudget !== null) {
    const spent = Number(promo.campaignSpent)
    const budget = Number(promo.campaignBudget)
    if (spent >= budget) return false
  }
  return true
}

export function calculateDiscount(params: {
  discountType: DiscountType
  discountValue: number
  maxDiscount: number | null
  eligibleSubtotal: number
  deliveryFee: number
  discountAppliesTo: DiscountAppliesTo
}): PromoCalculation {
  const { discountType, discountValue, maxDiscount, eligibleSubtotal, deliveryFee, discountAppliesTo } = params

  let discountAmount = 0
  let deliveryDiscount = 0

  if (discountType === 'PERCENTAGE') {
    discountAmount = Math.round((eligibleSubtotal * discountValue / 100) * 100) / 100
    if (maxDiscount !== null && discountAmount > maxDiscount) {
      discountAmount = maxDiscount
    }
  } else {
    discountAmount = Math.round(discountValue * 100) / 100
  }

  if (discountAppliesTo === 'PRODUCTS_AND_DELIVERY') {
    deliveryDiscount = Math.min(discountAmount, deliveryFee)
    discountAmount = Math.round((discountAmount - deliveryDiscount) * 100) / 100
  }

  const totalDiscount = discountAmount + deliveryDiscount
  const discountedSubtotal = Math.round((eligibleSubtotal - discountAmount) * 100) / 100

  return {
    originalSubtotal: eligibleSubtotal,
    discountAmount,
    deliveryDiscount,
    discountedSubtotal,
    maxDiscount: maxDiscount ?? null,
  }
}

export function doesPromoApplyToGroup(promo: any, group: { shopId?: string; productIds: string[]; categoryIds: string[]; campus?: string }): boolean {
  const appliesTo = promo.appliesTo ? JSON.parse(promo.appliesTo) : { type: 'ALL', values: [] }

  if (appliesTo.type === 'ALL') return true

  if (appliesTo.type === 'SHOPS' && appliesTo.values.length > 0) {
    if (group.shopId && appliesTo.values.includes(group.shopId)) return true
  }

  if (appliesTo.type === 'PRODUCTS' && appliesTo.values.length > 0) {
    const promoProductIds: string[] = appliesTo.values
    if (group.productIds && group.productIds.length > 0) {
      const hasMatch = group.productIds.some((pid: string) => promoProductIds.includes(pid))
      if (hasMatch) return true
    }
  }

  if (appliesTo.type === 'CATEGORIES' && appliesTo.values.length > 0) {
    const promoCategoryIds: string[] = appliesTo.values
    if (group.categoryIds && group.categoryIds.length > 0) {
      const hasMatch = group.categoryIds.some((cid: string) => promoCategoryIds.includes(cid))
      if (hasMatch) return true
    }
  }

  if (appliesTo.type === 'CAMPUSES' && appliesTo.values.length > 0) {
    const promoCampuses: string[] = appliesTo.values
    if (group.campus && promoCampuses.includes(group.campus)) return true
  }

  return false
}

export async function validatePromoCode(params: {
  code: string
  customerId?: string | null
  guestIdentifier?: string | null
  customerType?: 'NEW' | 'EXISTING' | null
  subtotal: number
  deliveryFee: number
  shopId?: string
  productIds?: string[]
  categoryIds?: string[]
  campus?: string
}): Promise<PromoValidationResult> {
  const normalizedCode = normalizeCode(params.code)
  if (!normalizedCode) {
    return { valid: false, error: 'Promo code is required', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
  }

  const promo = await prisma.promoCode.findUnique({
    where: { code: normalizedCode },
  })

  if (!promo) {
    return { valid: false, error: 'Invalid promo code', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
  }

  if (!isPromoActive(promo)) {
    if (promo.status === 'DRAFT') return { valid: false, error: 'This promo code is not active yet', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    if (promo.status === 'PAUSED') return { valid: false, error: 'This promo code is currently paused', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) return { valid: false, error: 'This promo code has reached its usage limit', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    if (promo.campaignBudget !== null && Number(promo.campaignSpent) >= Number(promo.campaignBudget)) {
      return { valid: false, error: 'This promo campaign budget has been exhausted', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    }
    return { valid: false, error: 'This promo code has expired', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
  }

  if (params.subtotal < Number(promo.minimumOrderAmount)) {
    return { valid: false, error: `Minimum order amount of GH₵${Number(promo.minimumOrderAmount).toFixed(2)} required`, discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
  }

  // Check customer eligibility
  if (promo.customerEligibility === 'NEW_ONLY' && params.customerType !== 'NEW') {
    return { valid: false, error: 'This promo code is for new customers only', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
  }
  if (promo.customerEligibility === 'EXISTING_ONLY' && params.customerType !== 'EXISTING') {
    return { valid: false, error: 'This promo code is for existing customers only', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
  }

  // Check targeting
  const appliesTo = promo.appliesTo ? JSON.parse(promo.appliesTo) : { type: 'ALL', values: [] }

  if (appliesTo.type === 'SHOPS' && appliesTo.values.length > 0) {
    const shopIds: string[] = appliesTo.values
    if (params.shopId && !shopIds.includes(params.shopId)) {
      return { valid: false, error: 'This promo code is not valid for this shop', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    }
  }

  if (appliesTo.type === 'PRODUCTS' && appliesTo.values.length > 0) {
    const promoProductIds: string[] = appliesTo.values
    if (params.productIds && params.productIds.length > 0) {
      const hasMatch = params.productIds.some(pid => promoProductIds.includes(pid))
      if (!hasMatch) {
        return { valid: false, error: 'This promo code is not valid for the selected products', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
      }
    }
  }

  if (appliesTo.type === 'CATEGORIES' && appliesTo.values.length > 0) {
    const promoCategoryIds: string[] = appliesTo.values
    if (params.categoryIds && params.categoryIds.length > 0) {
      const hasMatch = params.categoryIds.some(cid => promoCategoryIds.includes(cid))
      if (!hasMatch) {
        return { valid: false, error: 'This promo code is not valid for the selected categories', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
      }
    }
  }

  if (appliesTo.type === 'CAMPUSES' && appliesTo.values.length > 0) {
    const promoCampuses: string[] = appliesTo.values
    if (params.campus && !promoCampuses.includes(params.campus)) {
      return { valid: false, error: 'This promo code is not valid for your campus', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    }
  }

  // Check per-customer usage limit
  if (params.customerId && promo.usagePerCustomer !== null && promo.usagePerCustomer > 0) {
    const customerUsage = await prisma.promoRedemption.count({
      where: {
        promoCodeId: promo.id,
        customerId: params.customerId,
      },
    })
    if (customerUsage >= promo.usagePerCustomer) {
      return { valid: false, error: 'You have already used this promo code the maximum number of times', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    }
  }

  // For guest checkout, check guest identifier
  if (!params.customerId && params.guestIdentifier && promo.usagePerCustomer !== null && promo.usagePerCustomer > 0) {
    const guestUsage = await prisma.promoRedemption.count({
      where: {
        promoCodeId: promo.id,
        guestIdentifier: params.guestIdentifier,
      },
    })
    if (guestUsage >= promo.usagePerCustomer) {
      return { valid: false, error: 'You have already used this promo code the maximum number of times', discountAmount: 0, deliveryDiscount: 0, discountedSubtotal: params.subtotal }
    }
  }

  // Check if promo already applied to this order (for logged-in users)
  if (params.customerId) {
    const existingOrderPromo = await prisma.order.findFirst({
      where: {
        customerId: params.customerId,
        promoCodeId: promo.id,
        status: { not: 'CANCELLED' },
      },
    })
    // Allow if customer has previous orders but we only block current active order
    // This is handled at order creation time
  }

  const calculation = calculateDiscount({
    discountType: promo.discountType as DiscountType,
    discountValue: Number(promo.discountValue),
    maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
    eligibleSubtotal: params.subtotal,
    deliveryFee: params.deliveryFee,
    discountAppliesTo: promo.discountAppliesTo as DiscountAppliesTo,
  })

  return {
    valid: true,
    promo,
    discountAmount: calculation.discountAmount,
    deliveryDiscount: calculation.deliveryDiscount,
    discountedSubtotal: calculation.discountedSubtotal,
  }
}

export async function createPromoRedemption(params: {
  promoCodeId: string
  orderId: string
  customerId?: string | null
  guestIdentifier?: string | null
  originalSubtotal: number
  discountAmount: number
  discountedSubtotal: number
  deliveryDiscount: number
  fundingSource: FundingType
  sellerPayout: number
  pickamgoCommission: number
  pickamgoPromoExpense: number
  sellerFundedDiscount: number
}): Promise<PromoRedemption> {
  return prisma.promoRedemption.create({
    data: {
      promoCodeId: params.promoCodeId,
      orderId: params.orderId,
      customerId: params.customerId || null,
      guestIdentifier: params.guestIdentifier || null,
      originalSubtotal: params.originalSubtotal,
      discountAmount: params.discountAmount,
      discountedSubtotal: params.discountedSubtotal,
      deliveryDiscount: params.deliveryDiscount,
      fundingSource: params.fundingSource,
      sellerPayout: params.sellerPayout,
      pickamgoCommission: params.pickamgoCommission,
      pickamgoPromoExpense: params.pickamgoPromoExpense,
      sellerFundedDiscount: params.sellerFundedDiscount,
    },
  })
}

export async function incrementPromoUsage(promoCodeId: string, amount: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const promo = await tx.promoCode.findUnique({
      where: { id: promoCodeId },
    })
    if (!promo) return

    await tx.promoCode.update({
      where: { id: promoCodeId },
      data: {
        usageCount: { increment: 1 },
        campaignSpent: { increment: amount },
      },
    })
  })
}

export async function getPromoStats(promoId: string) {
  const [redemptions, totalDiscount, totalEligible, uniqueCustomers] = await Promise.all([
    prisma.promoRedemption.count({ where: { promoCodeId: promoId } }),
    prisma.promoRedemption.aggregate({
      where: { promoCodeId: promoId },
      _sum: { discountAmount: true },
    }),
    prisma.promoRedemption.aggregate({
      where: { promoCodeId: promoId },
      _sum: { originalSubtotal: true },
    }),
    prisma.promoRedemption.findMany({
      where: { promoCodeId: promoId },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
  ])

  const totalPickamgoExpense = await prisma.promoRedemption.aggregate({
    where: { promoCodeId: promoId },
    _sum: { pickamgoPromoExpense: true },
  })

  const totalSellerFunded = await prisma.promoRedemption.aggregate({
    where: { promoCodeId: promoId },
    _sum: { sellerFundedDiscount: true },
  })

  const totalCommission = await prisma.promoRedemption.aggregate({
    where: { promoCodeId: promoId },
    _sum: { pickamgoCommission: true },
  })

  const promo = await prisma.promoCode.findUnique({
    where: { id: promoId },
    select: { campaignBudget: true, campaignSpent: true, fundingType: true },
  })

  return {
    totalUses: redemptions,
    totalDiscount: Number(totalDiscount._sum.discountAmount || 0),
    totalEligibleSales: Number(totalEligible._sum.originalSubtotal || 0),
    totalPickamgoExpense: Number(totalPickamgoExpense._sum.pickamgoPromoExpense || 0),
    totalSellerFunded: Number(totalSellerFunded._sum.sellerFundedDiscount || 0),
    totalCommission: Number(totalCommission._sum.pickamgoCommission || 0),
    uniqueCustomers: uniqueCustomers.filter(r => r.customerId !== null).length,
    campaignBudget: promo?.campaignBudget ? Number(promo.campaignBudget) : null,
    campaignSpent: Number(promo?.campaignSpent || 0),
    fundingType: promo?.fundingType,
  }
}

export async function getPlatformPromoStats() {
  const [activePromos, totalUses, totalDiscount, pickamgoCost, revenueFromPromoOrders] = await Promise.all([
    prisma.promoCode.count({ where: { status: 'ACTIVE' } }),
    prisma.promoRedemption.count(),
    prisma.promoRedemption.aggregate({ _sum: { discountAmount: true } }),
    prisma.promoRedemption.aggregate({ where: { fundingSource: 'PICKAMGO' }, _sum: { pickamgoPromoExpense: true } }),
    prisma.promoRedemption.aggregate({ _sum: { discountedSubtotal: true } }),
  ])

  return {
    activePromos,
    totalUses,
    totalDiscount: Number(totalDiscount._sum.discountAmount || 0),
    pickamgoCost: Number(pickamgoCost._sum.pickamgoPromoExpense || 0),
    revenueFromPromoOrders: Number(revenueFromPromoOrders._sum.discountedSubtotal || 0),
  }
}
