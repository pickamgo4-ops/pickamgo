import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import {
  normalizeCode,
  isPromoActive,
  validatePromoCode,
  createPromoRedemption,
  incrementPromoUsage,
  getPromoStats,
  getPlatformPromoStats,
  calculateDiscount,
  type DiscountType,
  type FundingType,
  type PromoStatus,
  type CustomerEligibility,
  type DiscountAppliesTo,
} from '../services/promo'
import { createSellerEarnings } from '../services/earnings'

const router = Router()

const discountTypes = ['PERCENTAGE', 'FIXED'] as const
const fundingTypes = ['SELLER', 'PICKAMGO'] as const
const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'EXHAUSTED'] as const
const eligibilityOptions = ['EVERYONE', 'NEW_ONLY', 'EXISTING_ONLY'] as const
const appliesToOptions = ['PRODUCTS', 'PRODUCTS_AND_DELIVERY'] as const

const createPromoSchema = z.object({
  code: z.string().min(2).max(50),
  campaignName: z.string().optional(),
  description: z.string().optional(),
  discountType: z.enum(discountTypes),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().optional().nullable(),
  minimumOrderAmount: z.number().min(0).default(0),
  fundingType: z.enum(fundingTypes).default('SELLER'),
  usageLimit: z.number().int().positive().optional().nullable(),
  usagePerCustomer: z.number().int().positive().optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(statuses).default('DRAFT'),
  appliesTo: z.string().optional(),
  shopIds: z.array(z.string()).optional().nullable(),
  productIds: z.array(z.string()).optional().nullable(),
  categoryIds: z.array(z.string()).optional().nullable(),
  campuses: z.array(z.string()).optional().nullable(),
  customerEligibility: z.enum(eligibilityOptions).default('EVERYONE'),
  discountAppliesTo: z.enum(appliesToOptions).default('PRODUCTS'),
  campaignBudget: z.number().positive().optional().nullable(),
  sellerId: z.string().optional().nullable(),
})

const updatePromoSchema = createPromoSchema.partial().extend({
  id: z.string(),
})

const validatePromoSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0).default(0),
  shopId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  campus: z.string().optional(),
})

function getCustomerType(customerId: string | undefined | null): 'NEW' | 'EXISTING' | null {
  if (!customerId) return null
  return 'EXISTING'
}

// Public: validate promo code
router.post('/validate', optionalAuthMiddleware, validateBody(validatePromoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { code, subtotal, deliveryFee, shopId, productIds, categoryIds, campus } = req.body
    const result = await validatePromoCode({
      code,
      customerId: req.user?.id || null,
      guestIdentifier: req.user ? null : ((req as any).headers['x-session-id'] as string | undefined),
      customerType: getCustomerType(req.user?.id),
      subtotal,
      deliveryFee,
      shopId,
      productIds,
      categoryIds,
      campus,
    })

    if (!result.valid) {
      return errorResponse(res, result.error || 'Invalid promo code', 400)
    }

    return successResponse(res, {
      valid: true,
      code: result.promo?.code,
      campaignName: result.promo?.campaignName,
      discountType: result.promo?.discountType,
      discountValue: Number(result.promo?.discountValue),
      maxDiscount: result.promo?.maxDiscount ? Number(result.promo.maxDiscount) : null,
      discountAmount: result.discountAmount,
      deliveryDiscount: result.deliveryDiscount,
      discountedSubtotal: result.discountedSubtotal,
    })
  } catch (error) {
    console.error('Validate promo error:', error)
    return errorResponse(res, 'Failed to validate promo code', 500)
  }
})

// Admin: list all promos
router.get('/', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined
    const fundingType = req.query.fundingType as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (fundingType) where.fundingType = fundingType
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { campaignName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [promos, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promoCode.count({ where }),
    ])

    return successResponse(res, {
      promos: promos.map(p => ({
        ...p,
        discountValue: Number(p.discountValue),
        maxDiscount: p.maxDiscount ? Number(p.maxDiscount) : null,
        minimumOrderAmount: Number(p.minimumOrderAmount),
        campaignBudget: p.campaignBudget ? Number(p.campaignBudget) : null,
        campaignSpent: Number(p.campaignSpent),
        startAt: p.startAt.toISOString(),
        endAt: p.endAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('List promos error:', error)
    return errorResponse(res, 'Failed to fetch promos', 500)
  }
})

// Admin: get single promo
router.get('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const promo = await prisma.promoCode.findUnique({
      where: { id: req.params.id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        redemptions: {
          include: {
            order: {
              include: {
                customer: { select: { id: true, name: true, email: true } },
                shop: { select: { id: true, name: true } },
                seller: { select: { id: true, name: true } },
                sellerEarnings: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!promo) return errorResponse(res, 'Promo not found', 404)

    const stats = await getPromoStats(promo.id)

    return successResponse(res, {
      ...promo,
      discountValue: Number(promo.discountValue),
      maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
      minimumOrderAmount: Number(promo.minimumOrderAmount),
      campaignBudget: promo.campaignBudget ? Number(promo.campaignBudget) : null,
      campaignSpent: Number(promo.campaignSpent),
      startAt: promo.startAt.toISOString(),
      endAt: promo.endAt.toISOString(),
      stats,
    })
  } catch (error) {
    console.error('Get promo error:', error)
    return errorResponse(res, 'Failed to fetch promo', 500)
  }
})

// Admin: create promo
router.post('/', authMiddleware, requireRole(['ADMIN']), validateBody(createPromoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const data = req.body
    const normalizedCode = normalizeCode(data.code)

    const existing = await prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    })
    if (existing) {
      return errorResponse(res, 'A promo code with this code already exists', 409)
    }

    if (data.fundingType === 'PICKAMGO' && !data.campaignBudget) {
      return errorResponse(res, 'Campaign budget is required for PickAmGo-funded promotions', 400)
    }

    if (data.fundingType === 'PICKAMGO' && data.sellerId) {
      return errorResponse(res, 'PickAmGo-funded promotions cannot be tied to a specific seller', 400)
    }

    const startAt = new Date(data.startAt)
    const endAt = new Date(data.endAt)

    if (endAt <= startAt) {
      return errorResponse(res, 'End date must be after start date', 400)
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: normalizedCode,
        campaignName: data.campaignName || null,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscount: data.maxDiscount || null,
        minimumOrderAmount: data.minimumOrderAmount,
        fundingType: data.fundingType,
        usageLimit: data.usageLimit || null,
        usagePerCustomer: data.usagePerCustomer || null,
        startAt,
        endAt,
        status: data.status === 'ACTIVE' && isPromoActive({
          status: data.status,
          startAt,
          endAt,
          usageLimit: data.usageLimit,
          usageCount: 0,
          campaignBudget: data.campaignBudget ? new Prisma.Decimal(data.campaignBudget) : null,
          campaignSpent: new Prisma.Decimal(0),
        }) ? 'ACTIVE' : data.status,
        appliesTo: data.appliesTo || JSON.stringify({ type: 'ALL', values: [] }),
        shopIds: data.shopIds?.length ? JSON.stringify(data.shopIds) : null,
        productIds: data.productIds?.length ? JSON.stringify(data.productIds) : null,
        categoryIds: data.categoryIds?.length ? JSON.stringify(data.categoryIds) : null,
        campuses: data.campuses?.length ? JSON.stringify(data.campuses) : null,
        customerEligibility: data.customerEligibility,
        discountAppliesTo: data.discountAppliesTo,
        campaignBudget: data.campaignBudget ? new Prisma.Decimal(data.campaignBudget) : null,
        campaignSpent: new Prisma.Decimal(0),
        createdBy: req.user!.id,
        sellerId: data.sellerId || null,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
    })

    return successResponse(res, {
      ...promo,
      discountValue: Number(promo.discountValue),
      maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
      minimumOrderAmount: Number(promo.minimumOrderAmount),
      campaignBudget: promo.campaignBudget ? Number(promo.campaignBudget) : null,
      campaignSpent: Number(promo.campaignSpent),
      startAt: promo.startAt.toISOString(),
      endAt: promo.endAt.toISOString(),
    }, 201, 'Promo code created successfully')
  } catch (error) {
    console.error('Create promo error:', error)
    return errorResponse(res, 'Failed to create promo code', 500)
  }
})

// Admin: update promo
router.patch('/:id', authMiddleware, requireRole(['ADMIN']), validateBody(updatePromoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.promoCode.findUnique({ where: { id } })
    if (!existing) return errorResponse(res, 'Promo not found', 404)

    const normalizedCode = data.code ? normalizeCode(data.code) : existing.code
    const codeConflict = await prisma.promoCode.findFirst({
      where: { code: normalizedCode, id: { not: id } },
    })
    if (codeConflict) {
      return errorResponse(res, 'Another promo with this code already exists', 409)
    }

    if (data.fundingType === 'PICKAMGO' && data.sellerId) {
      return errorResponse(res, 'PickAmGo-funded promotions cannot be tied to a specific seller', 400)
    }

    const startAt = data.startAt ? new Date(data.startAt) : existing.startAt
    const endAt = data.endAt ? new Date(data.endAt) : existing.endAt

    if (endAt <= startAt) {
      return errorResponse(res, 'End date must be after start date', 400)
    }

    const updateData: any = {}
    if (data.code !== undefined) updateData.code = normalizedCode
    if (data.campaignName !== undefined) updateData.campaignName = data.campaignName || null
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.discountType !== undefined) updateData.discountType = data.discountType
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount || null
    if (data.minimumOrderAmount !== undefined) updateData.minimumOrderAmount = data.minimumOrderAmount
    if (data.fundingType !== undefined) updateData.fundingType = data.fundingType
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit || null
    if (data.usagePerCustomer !== undefined) updateData.usagePerCustomer = data.usagePerCustomer || null
    if (data.startAt !== undefined) updateData.startAt = startAt
    if (data.endAt !== undefined) updateData.endAt = endAt
    if (data.status !== undefined) updateData.status = data.status
    if (data.appliesTo !== undefined) updateData.appliesTo = data.appliesTo || JSON.stringify({ type: 'ALL', values: [] })
    if (data.shopIds !== undefined) updateData.shopIds = data.shopIds?.length ? JSON.stringify(data.shopIds) : null
    if (data.productIds !== undefined) updateData.productIds = data.productIds?.length ? JSON.stringify(data.productIds) : null
    if (data.categoryIds !== undefined) updateData.categoryIds = data.categoryIds?.length ? JSON.stringify(data.categoryIds) : null
    if (data.campuses !== undefined) updateData.campuses = data.campuses?.length ? JSON.stringify(data.campuses) : null
    if (data.customerEligibility !== undefined) updateData.customerEligibility = data.customerEligibility
    if (data.discountAppliesTo !== undefined) updateData.discountAppliesTo = data.discountAppliesTo
    if (data.campaignBudget !== undefined) updateData.campaignBudget = data.campaignBudget ? new Prisma.Decimal(data.campaignBudget) : null
    if (data.sellerId !== undefined) updateData.sellerId = data.sellerId || null

    const updated = await prisma.promoCode.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
    })

    return successResponse(res, {
      ...updated,
      discountValue: Number(updated.discountValue),
      maxDiscount: updated.maxDiscount ? Number(updated.maxDiscount) : null,
      minimumOrderAmount: Number(updated.minimumOrderAmount),
      campaignBudget: updated.campaignBudget ? Number(updated.campaignBudget) : null,
      campaignSpent: Number(updated.campaignSpent),
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
    }, undefined, 'Promo code updated successfully')
  } catch (error) {
    console.error('Update promo error:', error)
    return errorResponse(res, 'Failed to update promo code', 500)
  }
})

// Admin: delete promo
router.delete('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const existing = await prisma.promoCode.findUnique({ where: { id } })
    if (!existing) return errorResponse(res, 'Promo not found', 404)

    await prisma.promoCode.delete({ where: { id } })
    return successResponse(res, null, 200, 'Promo code deleted successfully')
  } catch (error) {
    console.error('Delete promo error:', error)
    return errorResponse(res, 'Failed to delete promo code', 500)
  }
})

// Admin: platform stats
router.get('/stats/overview', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await getPlatformPromoStats()
    return successResponse(res, stats)
  } catch (error) {
    console.error('Promo stats error:', error)
    return errorResponse(res, 'Failed to fetch promo stats', 500)
  }
})

export default router
