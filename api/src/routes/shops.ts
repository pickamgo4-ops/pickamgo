import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const themes = ['CLEAN', 'MIDNIGHT', 'SOFT', 'LUXURY', 'FRESH', 'CAMPUS', 'STREET', 'BEAUTY'] as const
const layouts = ['CLASSIC', 'GRID', 'FEATURED', 'BEAUTY', 'CAMPUS'] as const
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colors must be six-digit hex values')
const customizationFields = {
  theme: z.enum(themes).default('CLEAN'),
  layout: z.enum(layouts).default('CLASSIC'),
  primaryColor: colorSchema.default('#FF6B35'),
  secondaryColor: colorSchema.default('#FFF5E6'),
  accentColor: colorSchema.default('#2C1F15'),
  logo: z.string().refine(value => value.startsWith('/') || /^https?:\/\//.test(value), 'Invalid logo URL').nullable().optional(),
  coverImage: z.string().refine(value => value.startsWith('/') || /^https?:\/\//.test(value), 'Invalid cover URL').nullable().optional(),
  profileImage: z.string().refine(value => value.startsWith('/') || /^https?:\/\//.test(value), 'Invalid profile URL').nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  announcement: z.string().max(160).nullable().optional(),
  featuredProductId: z.string().nullable().optional(),
  showReviews: z.boolean().default(true),
  showCategories: z.boolean().default(true),
  showFeatured: z.boolean().default(true),
  showServices: z.boolean().default(true),
}
const customizationSchema = z.object(customizationFields).partial()

const getOwnedShop = async (req: AuthenticatedRequest) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } })
  if (!shop) return { error: 'Shop not found', status: 404 }
  if (shop.ownerId !== req.user!.id && !req.user!.isAdmin) return { error: 'Not authorized to update this shop', status: 403 }
  return { shop }
}

const draftToResponse = (customization: any) => ({
  theme: customization.draftTheme,
  layout: customization.draftLayout,
  primaryColor: customization.draftPrimaryColor,
  secondaryColor: customization.draftSecondaryColor,
  accentColor: customization.draftAccentColor,
  logo: customization.draftLogo,
  coverImage: customization.draftCoverImage,
  profileImage: customization.draftProfileImage,
  description: customization.draftDescription,
  announcement: customization.draftAnnouncement,
  featuredProductId: customization.draftFeaturedProductId,
  showReviews: customization.draftShowReviews,
  showCategories: customization.draftShowCategories,
  showFeatured: customization.draftShowFeatured,
  showServices: customization.draftShowServices,
})

const publishedToResponse = (customization: any) => customization?.publishedAt ? {
  theme: customization.publishedTheme,
  layout: customization.publishedLayout,
  primaryColor: customization.publishedPrimaryColor,
  secondaryColor: customization.publishedSecondaryColor,
  accentColor: customization.publishedAccentColor,
  logo: customization.publishedLogo,
  coverImage: customization.publishedCoverImage,
  profileImage: customization.publishedProfileImage,
  description: customization.publishedDescription,
  announcement: customization.publishedAnnouncement,
  featuredProductId: customization.publishedFeaturedProductId,
  showReviews: customization.publishedShowReviews,
  showCategories: customization.publishedShowCategories,
  showFeatured: customization.publishedShowFeatured,
  showServices: customization.publishedShowServices,
} : null

const draftData = (data: any) => Object.fromEntries(Object.entries(data).map(([key, value]) => [`draft${key[0].toUpperCase()}${key.slice(1)}`, value]))

router.get('/:id/customization', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const result = await getOwnedShop(req)
  if (result.error) return errorResponse(res, result.error, result.status)
  const customization = await prisma.shopCustomization.upsert({
    where: { shopId: result.shop!.id },
    create: { shopId: result.shop!.id },
    update: {},
  })
  return successResponse(res, { draft: draftToResponse(customization), published: publishedToResponse(customization) })
})

router.patch('/:id/customization', authMiddleware, requireRole(['SELLER']), validateBody(customizationSchema), async (req: AuthenticatedRequest, res) => {
  const result = await getOwnedShop(req)
  if (result.error) return errorResponse(res, result.error, result.status)
  if (req.body.featuredProductId) {
    const product = await prisma.product.findFirst({ where: { id: req.body.featuredProductId, shopId: result.shop!.id, status: 'ACTIVE' } })
    if (!product) return errorResponse(res, 'Featured product must be an active product from your shop', 400)
  }
  const customization = await prisma.shopCustomization.upsert({
    where: { shopId: result.shop!.id },
    create: { shopId: result.shop!.id, ...draftData(req.body) },
    update: draftData(req.body),
  })
  return successResponse(res, { draft: draftToResponse(customization), published: publishedToResponse(customization) }, 200, 'Draft saved')
})

router.post('/:id/customization/publish', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const result = await getOwnedShop(req)
  if (result.error) return errorResponse(res, result.error, result.status)
  const customization = await prisma.shopCustomization.upsert({
    where: { shopId: result.shop!.id },
    create: { shopId: result.shop!.id },
    update: {},
  })
  const published = await prisma.shopCustomization.update({
    where: { id: customization.id },
    data: {
      publishedTheme: customization.draftTheme,
      publishedLayout: customization.draftLayout,
      publishedPrimaryColor: customization.draftPrimaryColor,
      publishedSecondaryColor: customization.draftSecondaryColor,
      publishedAccentColor: customization.draftAccentColor,
      publishedLogo: customization.draftLogo,
      publishedCoverImage: customization.draftCoverImage,
      publishedProfileImage: customization.draftProfileImage,
      publishedDescription: customization.draftDescription,
      publishedAnnouncement: customization.draftAnnouncement,
      publishedFeaturedProductId: customization.draftFeaturedProductId,
      publishedShowReviews: customization.draftShowReviews,
      publishedShowCategories: customization.draftShowCategories,
      publishedShowFeatured: customization.draftShowFeatured,
      publishedShowServices: customization.draftShowServices,
      publishedAt: new Date(),
    },
  })
  return successResponse(res, { draft: draftToResponse(published), published: publishedToResponse(published) }, 200, 'Shop customization published')
})

router.post('/:id/customization/reset', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const result = await getOwnedShop(req)
  if (result.error) return errorResponse(res, result.error, result.status)
  const customization = await prisma.shopCustomization.upsert({
    where: { shopId: result.shop!.id },
    create: { shopId: result.shop!.id },
    update: {
      draftTheme: 'CLEAN', draftLayout: 'CLASSIC', draftPrimaryColor: '#FF6B35',
      draftSecondaryColor: '#FFF5E6', draftAccentColor: '#2C1F15', draftLogo: null,
      draftCoverImage: null, draftProfileImage: null, draftDescription: null,
      draftAnnouncement: null, draftFeaturedProductId: null, draftShowReviews: true,
      draftShowCategories: true, draftShowFeatured: true, draftShowServices: true,
    },
  })
  return successResponse(res, { draft: draftToResponse(customization), published: publishedToResponse(customization) }, 200, 'Draft reset to default')
})

const listShopsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  location: z.string().optional(),
  area: z.string().optional(),
  campus: z.string().optional(),
  verified: z.coerce.boolean().optional(),
  sort: z.enum(['rating', 'newest', 'followers']).default('rating'),
})

router.get('/', async (req, res) => {
  const query = listShopsQuerySchema.parse(req.query)
  const where: any = { isVerified: true }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.location) where.location = { contains: query.location, mode: 'insensitive' }
  if (query.area) where.area = { contains: query.area, mode: 'insensitive' }
  if (query.campus) where.campus = { contains: query.campus, mode: 'insensitive' }
  if (query.verified !== undefined) where.isVerified = query.verified

  const orderBy: any = {}
  if (query.sort === 'rating') orderBy.rating = 'desc'
  else if (query.sort === 'newest') orderBy.createdAt = 'desc'
  else if (query.sort === 'followers') orderBy.followersCount = 'desc'

  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
      owner: {
          select: { id: true, name: true, avatar: true, location: true },
        },
      },
    }),
    prisma.shop.count({ where }),
  ])

  return successResponse(res, {
    shops,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  })
})

router.get('/:slug', async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { slug: req.params.slug },
    include: {
      owner: {
        select: { id: true, name: true, avatar: true, location: true },
      },
      products: {
        where: { status: 'ACTIVE' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 4 },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      services: {
        where: { status: 'ACTIVE' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 4 },
          availability: { where: { isAvailable: true }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      followers: true,
      shopCategories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      customization: true,
    },
  })

  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const shopResponse = {
    ...shop,
    customization: publishedToResponse(shop.customization),
    followersCount: shop.followersCount,
    deliveryAvailable: shop.deliveryAvailable,
    pickupAvailable: shop.pickupAvailable,
    sellerDeliveryAvailable: shop.sellerDeliveryAvailable,
    platformDeliveryFee: shop.platformDeliveryFee,
    sellerDeliveryFee: shop.sellerDeliveryFee,
    pickupInstructions: shop.pickupInstructions,
  }

  return successResponse(res, shopResponse)
})

const createShopSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  logo: z.string().url(),
  banner: z.string().url().optional(),
  location: z.string().min(2),
  area: z.string().optional(),
  campus: z.string().optional(),
  openingHours: z.string().min(3),
  category: z.string().min(1),
})

router.post('/', authMiddleware, requireRole(['SELLER']), validateBody(createShopSchema), async (req: AuthenticatedRequest, res) => {
  const { name, description, logo, banner, location, area, campus, openingHours, category } = req.body

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop'
  const shopData = { name, description, logo, banner, location, area, campus, openingHours, ownerId: req.user!.id }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
    try {
      const shop = await prisma.shop.create({
        data: { ...shopData, slug },
        include: { owner: { select: { id: true, name: true, avatar: true } } },
      })
      return successResponse(res, shop, 201, 'Shop created successfully')
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error
    }
  }

  return errorResponse(res, 'Unable to generate a unique shop URL', 409)
})

const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  location: z.string().min(2).optional(),
  area: z.string().optional(),
  campus: z.string().optional(),
  openingHours: z.string().min(3).optional(),
  isOpen: z.boolean().optional(),
})

router.patch('/:id', authMiddleware, validateBody(updateShopSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)
  if (shop.ownerId !== req.user!.id && !req.user!.isAdmin) {
    return errorResponse(res, 'Not authorized to update this shop', 403)
  }

  const data: any = { ...req.body }
  if (data.name && (!shop.slug || shop.slug === '')) {
    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop'
    let slug = baseSlug
    let attempt = 1
    while (attempt < 10) {
      const existing = await prisma.shop.findFirst({ where: { slug, id: { not: shop.id } } })
      if (!existing) break
      slug = `${baseSlug}-${attempt + 1}`
      attempt++
    }
    data.slug = slug
  }

  const updated = await prisma.shop.update({
    where: { id: req.params.id },
    data,
    include: { owner: { select: { id: true, name: true, avatar: true } } },
  })

  return successResponse(res, updated, undefined, 'Shop updated successfully')
})

router.get('/:id/products', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { shopId: req.params.id, status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        seller: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where: { shopId: req.params.id, status: 'ACTIVE' } }),
  ])

  return successResponse(res, {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

router.get('/:id/services', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where: { shopId: req.params.id, status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        provider: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.service.count({ where: { shopId: req.params.id, status: 'ACTIVE' } }),
  ])

  return successResponse(res, {
    services,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

router.get('/:id/delivery-settings', async (req, res) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        sellerDeliveryAvailable: true,
        platformDeliveryFee: true,
        sellerDeliveryFee: true,
        pickupInstructions: true,
        deliveryZones: true,
      },
    })

    if (!shop) {
      return errorResponse(res, 'Shop not found', 404)
    }

    return successResponse(res, shop)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch delivery settings', 500)
  }
})

export default router
