import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import {
  normalizeCode,
  isPromoActive,
  validatePromoCode,
  getPromoStats,
  type DiscountType,
  type PromoStatus,
  type CustomerEligibility,
  type DiscountAppliesTo,
} from '../services/promo'

const router = Router()

const discountTypes = ['PERCENTAGE', 'FIXED'] as const
const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'EXHAUSTED'] as const
const eligibilityOptions = ['EVERYONE', 'NEW_ONLY', 'EXISTING_ONLY'] as const
const appliesToOptions = ['PRODUCTS', 'PRODUCTS_AND_DELIVERY'] as const

const createSellerPromoSchema = z.object({
  code: z.string().min(2).max(50),
  campaignName: z.string().optional(),
  description: z.string().optional(),
  discountType: z.enum(discountTypes),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().optional().nullable(),
  minimumOrderAmount: z.number().min(0).default(0),
  usageLimit: z.number().int().positive().optional().nullable(),
  usagePerCustomer: z.number().int().positive().optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(statuses).default('DRAFT'),
  customerEligibility: z.enum(eligibilityOptions).default('EVERYONE'),
  discountAppliesTo: z.enum(appliesToOptions).default('PRODUCTS'),
  shopIds: z.array(z.string()).optional().nullable(),
  productIds: z.array(z.string()).optional().nullable(),
  categoryIds: z.array(z.string()).optional().nullable(),
  campuses: z.array(z.string()).optional().nullable(),
})

const updateSellerPromoSchema = createSellerPromoSchema.partial().extend({
  id: z.string(),
})

// Seller: list own promos
router.get('/', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const seller = await prisma.shop.findFirst({
      where: { ownerId: req.user!.id },
      select: { id: true },
    })
    if (!seller) {
      return errorResponse(res, 'No shop found for this seller', 404)
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined

    const where: any = {
      sellerId: req.user!.id,
    }
    if (status) where.status = status
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
    console.error('List seller promos error:', error)
    return errorResponse(res, 'Failed to fetch promos', 500)
  }
})

// Seller: get single promo
router.get('/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const promo = await prisma.promoCode.findFirst({
      where: { id: req.params.id, sellerId: req.user!.id },
      include: {
        redemptions: {
          include: {
            order: {
              include: {
                customer: { select: { id: true, name: true, email: true } },
                shop: { select: { id: true, name: true } },
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
    console.error('Get seller promo error:', error)
    return errorResponse(res, 'Failed to fetch promo', 500)
  }
})

// Seller: create promo
router.post('/', authMiddleware, requireRole(['SELLER']), validateBody(createSellerPromoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const data = req.body
    const normalizedCode = normalizeCode(data.code)

    const existing = await prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    })
    if (existing) {
      return errorResponse(res, 'A promo code with this code already exists', 409)
    }

    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user!.id },
      select: { id: true },
    })
    if (!shop) {
      return errorResponse(res, 'No shop found for this seller', 404)
    }

    const startAt = new Date(data.startAt)
    const endAt = new Date(data.endAt)

    if (endAt <= startAt) {
      return errorResponse(res, 'End date must be after start date', 400)
    }

    const shopIds = data.shopIds?.length ? data.shopIds : [shop.id]
    const productIds = data.productIds?.length ? data.productIds : []
    const categoryIds = data.categoryIds?.length ? data.categoryIds : []
    const campuses = data.campuses?.length ? data.campuses : []

    const appliesTo = productIds.length > 0
      ? JSON.stringify({ type: 'PRODUCTS', values: productIds })
      : categoryIds.length > 0
        ? JSON.stringify({ type: 'CATEGORIES', values: categoryIds })
        : campuses.length > 0
          ? JSON.stringify({ type: 'CAMPUSES', values: campuses })
          : shopIds.length > 0
            ? JSON.stringify({ type: 'SHOPS', values: shopIds })
            : JSON.stringify({ type: 'ALL', values: [] })

    const promo = await prisma.promoCode.create({
      data: {
        code: normalizedCode,
        campaignName: data.campaignName || null,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscount: data.maxDiscount || null,
        minimumOrderAmount: data.minimumOrderAmount,
        fundingType: 'SELLER',
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
          campaignBudget: null,
          campaignSpent: new (require('@prisma/client').Prisma).Decimal(0),
        }) ? 'ACTIVE' : data.status,
        appliesTo,
        shopIds: JSON.stringify(shopIds),
        productIds: productIds.length > 0 ? JSON.stringify(productIds) : null,
        categoryIds: categoryIds.length > 0 ? JSON.stringify(categoryIds) : null,
        campuses: campuses.length > 0 ? JSON.stringify(campuses) : null,
        customerEligibility: data.customerEligibility,
        discountAppliesTo: data.discountAppliesTo,
        campaignBudget: null,
        campaignSpent: new (require('@prisma/client').Prisma).Decimal(0),
        createdBy: req.user!.id,
        sellerId: req.user!.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
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
    console.error('Create seller promo error:', error)
    return errorResponse(res, 'Failed to create promo code', 500)
  }
})

// Seller: update promo
router.patch('/:id', authMiddleware, requireRole(['SELLER']), validateBody(updateSellerPromoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.promoCode.findFirst({
      where: { id, sellerId: req.user!.id },
    })
    if (!existing) return errorResponse(res, 'Promo not found', 404)

    const normalizedCode = data.code ? normalizeCode(data.code) : existing.code
    const codeConflict = await prisma.promoCode.findFirst({
      where: { code: normalizedCode, id: { not: id } },
    })
    if (codeConflict) {
      return errorResponse(res, 'Another promo with this code already exists', 409)
    }

    const startAt = data.startAt ? new Date(data.startAt) : existing.startAt
    const endAt = data.endAt ? new Date(data.endAt) : existing.endAt

    if (endAt <= startAt) {
      return errorResponse(res, 'End date must be after start date', 400)
    }

    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user!.id },
      select: { id: true },
    })

    const shopIds = data.shopIds?.length ? data.shopIds : (shop ? [shop.id] : [])
    const productIds = data.productIds?.length ? data.productIds : []
    const categoryIds = data.categoryIds?.length ? data.categoryIds : []
    const campuses = data.campuses?.length ? data.campuses : []

    const appliesTo = productIds.length > 0
      ? JSON.stringify({ type: 'PRODUCTS', values: productIds })
      : categoryIds.length > 0
        ? JSON.stringify({ type: 'CATEGORIES', values: categoryIds })
        : campuses.length > 0
          ? JSON.stringify({ type: 'CAMPUSES', values: campuses })
          : shopIds.length > 0
            ? JSON.stringify({ type: 'SHOPS', values: shopIds })
            : JSON.stringify({ type: 'ALL', values: [] })

    const updateData: any = {}
    if (data.code !== undefined) updateData.code = normalizedCode
    if (data.campaignName !== undefined) updateData.campaignName = data.campaignName || null
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.discountType !== undefined) updateData.discountType = data.discountType
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount || null
    if (data.minimumOrderAmount !== undefined) updateData.minimumOrderAmount = data.minimumOrderAmount
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit || null
    if (data.usagePerCustomer !== undefined) updateData.usagePerCustomer = data.usagePerCustomer || null
    if (data.startAt !== undefined) updateData.startAt = startAt
    if (data.endAt !== undefined) updateData.endAt = endAt
    if (data.status !== undefined) updateData.status = data.status
    if (data.customerEligibility !== undefined) updateData.customerEligibility = data.customerEligibility
    if (data.discountAppliesTo !== undefined) updateData.discountAppliesTo = data.discountAppliesTo
    updateData.appliesTo = appliesTo
    updateData.shopIds = JSON.stringify(shopIds)
    updateData.productIds = productIds.length > 0 ? JSON.stringify(productIds) : null
    updateData.categoryIds = categoryIds.length > 0 ? JSON.stringify(categoryIds) : null
    updateData.campuses = campuses.length > 0 ? JSON.stringify(campuses) : null

    const updated = await prisma.promoCode.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
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
    console.error('Update seller promo error:', error)
    return errorResponse(res, 'Failed to update promo code', 500)
  }
})

// Seller: delete promo
router.delete('/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const existing = await prisma.promoCode.findFirst({
      where: { id, sellerId: req.user!.id },
    })
    if (!existing) return errorResponse(res, 'Promo not found', 404)

    await prisma.promoCode.delete({ where: { id } })
    return successResponse(res, null, 200, 'Promo code deleted successfully')
  } catch (error) {
    console.error('Delete seller promo error:', error)
    return errorResponse(res, 'Failed to delete promo code', 500)
  }
})

export default router
