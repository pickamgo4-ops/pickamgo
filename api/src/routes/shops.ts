import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { distanceInKm } from '../utils/geo'
import { publicProductVisibility, publicServiceVisibility } from '../utils/visibility'
import { assertModerationSafe } from '../utils/moderation'
import { identitySimilarity, isPlatformImpersonationName, normalizeIdentityName } from '../utils/identitySecurity'

const router = Router()

const legacyQuickPicksId = 'CAMP' + 'US'
const themes = ['CLEAN', 'MIDNIGHT', 'SOFT', 'LUXURY', 'FRESH', 'QUICK_PICKS', legacyQuickPicksId, 'STREET', 'BEAUTY'] as const
const layouts = ['CLASSIC', 'GRID', 'FEATURED', 'BEAUTY', 'QUICK_PICKS', legacyQuickPicksId] as const
const reservedShopSlugs = new Set(['www', 'api', 'admin', 'app', 'mail', 'support', 'help', 'dashboard', 'checkout', 'login', 'signup'])
const shopSlugFromName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop'
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
  headerStyle: z.enum(['STANDARD', 'COMPACT', 'CENTERED']).default('STANDARD'),
  bannerStyle: z.enum(['COVER', 'SHORT', 'MINIMAL']).default('COVER'),
  productCardStyle: z.enum(['SOFT', 'OUTLINED', 'EDITORIAL']).default('SOFT'),
  productColumns: z.number().int().min(2).max(5).default(4),
  showAbout: z.boolean().default(true),
  showHours: z.boolean().default(true),
  showContact: z.boolean().default(true),
  sectionOrder: z.string().max(200).default('featured,products,services,reviews,about'),
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
  headerStyle: customization.draftHeaderStyle,
  bannerStyle: customization.draftBannerStyle,
  productCardStyle: customization.draftProductCardStyle,
  productColumns: customization.draftProductColumns,
  showAbout: customization.draftShowAbout,
  showHours: customization.draftShowHours,
  showContact: customization.draftShowContact,
  sectionOrder: customization.draftSectionOrder,
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
  headerStyle: customization.publishedHeaderStyle,
  bannerStyle: customization.publishedBannerStyle,
  productCardStyle: customization.publishedProductCardStyle,
  productColumns: customization.publishedProductColumns,
  showAbout: customization.publishedShowAbout,
  showHours: customization.publishedShowHours,
  showContact: customization.publishedShowContact,
  sectionOrder: customization.publishedSectionOrder,
} : null

const effectiveCustomization = (customization: any) => {
  if (!customization) return null
  const published = publishedToResponse(customization)
  if (published) return published
  return draftToResponse(customization)
}

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
      publishedHeaderStyle: customization.draftHeaderStyle,
      publishedBannerStyle: customization.draftBannerStyle,
      publishedProductCardStyle: customization.draftProductCardStyle,
      publishedProductColumns: customization.draftProductColumns,
      publishedShowAbout: customization.draftShowAbout,
      publishedShowHours: customization.draftShowHours,
      publishedShowContact: customization.draftShowContact,
      publishedSectionOrder: customization.draftSectionOrder,
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
      draftHeaderStyle: 'STANDARD', draftBannerStyle: 'COVER', draftProductCardStyle: 'SOFT', draftProductColumns: 4,
      draftShowAbout: true, draftShowHours: true, draftShowContact: true,
      draftSectionOrder: 'featured,products,services,reviews,about',
    },
  })
  return successResponse(res, { draft: draftToResponse(customization), published: publishedToResponse(customization) }, 200, 'Draft reset to default')
})

router.get('/:slug/customization', async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: { slug: req.params.slug, status: 'ACTIVE' },
      include: { customization: true },
    })
    if (!shop) return errorResponse(res, 'Shop not found', 404)

    let customization = shop.customization
    if (!customization) {
      customization = await prisma.shopCustomization.create({
        data: {
          shopId: shop.id,
          draftTheme: 'CLEAN',
          draftLayout: 'CLASSIC',
          draftPrimaryColor: '#FF6B35',
          draftSecondaryColor: '#FFF5E6',
          draftAccentColor: '#2C1F15',
          draftShowReviews: true,
          draftShowCategories: true,
          draftShowFeatured: true,
          draftShowServices: true,
          draftHeaderStyle: 'STANDARD',
          draftBannerStyle: 'COVER',
          draftProductCardStyle: 'SOFT',
          draftProductColumns: 4,
          draftShowAbout: true,
          draftShowHours: true,
          draftShowContact: true,
          draftSectionOrder: 'featured,products,services,reviews,about',
        },
      })
    }

    return successResponse(res, { customization: effectiveCustomization(customization) })
  } catch (error) {
    console.error('Failed to load public shop customization:', error)
    return errorResponse(res, 'Failed to load shop customization', 500)
  }
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
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100).default(25),
})

router.get('/', async (req, res) => {
  const query = listShopsQuerySchema.parse(req.query)
  const where: any = { status: 'ACTIVE' }

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

  const shopsWithDistance = query.latitude !== undefined && query.longitude !== undefined
    ? shops
      .map(shop => ({
        ...shop,
        distanceKm: shop.latitude != null && shop.longitude != null
          ? distanceInKm({ latitude: query.latitude!, longitude: query.longitude! }, { latitude: shop.latitude, longitude: shop.longitude })
          : null,
      }))
      .filter(shop => shop.distanceKm !== null && shop.distanceKm <= query.radius)
      .sort((a, b) => a.distanceKm! - b.distanceKm!)
    : shops

  return successResponse(res, {
    shops: shopsWithDistance.length >= 3 || query.latitude === undefined ? shopsWithDistance : shops,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  })
})

router.get('/slug-availability', async (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  const slug = shopSlugFromName(name)
  if (!name || name.length < 2) return successResponse(res, { available: false, slug, reason: 'Enter at least 2 characters.' })
  if (reservedShopSlugs.has(slug)) return successResponse(res, { available: false, slug, reason: 'This store URL is reserved.' })
  const existing = await prisma.shop.findUnique({ where: { slug }, select: { id: true, name: true } })
  return successResponse(res, { available: !existing, slug, reason: existing ? 'This store URL is already taken.' : null })
})

router.get('/:slug', async (req, res) => {
  const shop = await prisma.shop.findFirst({
    where: { slug: req.params.slug },
    include: {
      owner: {
        select: { id: true, name: true, avatar: true, location: true },
      },
      products: {
        where: publicProductVisibility,
        include: {
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 4 },
          promotionItems: {
            where: { promotion: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
            include: { promotion: { select: { id: true, name: true, type: true } } },
            orderBy: { promotion: { endsAt: 'asc' } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      services: {
        where: publicServiceVisibility,
        include: {
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 4 },
          availability: { where: { isAvailable: true }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      followers: true,
      shopCategories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      customization: true,
      shippingZones: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      collections: {
        where: { isVisible: true },
        include: {
          products: {
            include: {
              product: {
                include: {
                  images: true,
                  promotionItems: {
                    where: { promotion: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
                    include: { promotion: { select: { id: true, name: true, type: true } } },
                    orderBy: { promotion: { endsAt: 'asc' } },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      promotions: { where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } }, include: { products: { include: { product: true } } } },
    },
  })

  if (!shop) return errorResponse(res, 'Shop not found', 404)
  if (shop.status !== 'ACTIVE') return errorResponse(res, 'Shop not found', 404)

  let customization = shop.customization
  if (!customization) {
    customization = await prisma.shopCustomization.create({
      data: {
        shopId: shop.id,
        draftTheme: 'CLEAN',
        draftLayout: 'CLASSIC',
        draftPrimaryColor: '#FF6B35',
        draftSecondaryColor: '#FFF5E6',
        draftAccentColor: '#2C1F15',
        draftShowReviews: true,
        draftShowCategories: true,
        draftShowFeatured: true,
        draftShowServices: true,
      },
    })
  }

  const shopResponse = {
    ...shop,
    customization: effectiveCustomization(customization),
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
  logo: z.string().url().optional().or(z.literal('')),
  banner: z.string().url().optional().or(z.literal('')),
  location: z.string().min(2),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  area: z.string().optional().or(z.literal('')),
  campus: z.string().optional().or(z.literal('')),
  openingHours: z.string().min(3),
  category: z.string().min(1),
})

router.post('/', authMiddleware, requireRole(['SELLER']), validateBody(createShopSchema), async (req: AuthenticatedRequest, res) => {
  const { name, description, logo, banner, location, area, campus, latitude, longitude, openingHours, category } = req.body

  try {
    assertModerationSafe(name, 'shop name')
    assertModerationSafe(description, 'shop description')
  } catch (error: any) {
    return errorResponse(res, 'For your safety, PickAmGo does not allow users to exchange personal contact or payment information for transactions outside the platform. [Edit Message]', 400)
  }

  if (isPlatformImpersonationName(name)) {
    return errorResponse(res, 'This shop name cannot impersonate PickAmGo. Legitimate brand ownership can be reviewed by support.', 409, 'SHOP_IMPERSONATION_REVIEW')
  }

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop'
  if (reservedShopSlugs.has(baseSlug)) {
    return errorResponse(res, 'That shop name is reserved. Please choose another name.', 409)
  }
  const existingSlug = await prisma.shop.findUnique({ where: { slug: baseSlug }, select: { id: true } })
  if (existingSlug) {
    return errorResponse(res, 'That shop name is already taken. Please choose another name.', 409)
  }
  const shopData = { name, description, logo, banner, location, area, campus, latitude, longitude, openingHours, ownerId: req.user!.id }
  const normalizedShopName = normalizeIdentityName(name)
  const [verifiedShops, sellerNames] = await Promise.all([
    prisma.shop.findMany({ where: { isVerified: true, status: 'ACTIVE' }, select: { id: true, name: true, ownerId: true }, take: 200 }),
    prisma.user.findMany({ where: { isSeller: true, id: { not: req.user!.id } }, select: { id: true, name: true }, take: 200 }),
  ])
  const similarShop = verifiedShops.find(existing => identitySimilarity(name, existing.name) >= 0.9)
  const officialNameMatch = sellerNames.find(existing => normalizedShopName.includes('official') && identitySimilarity(name, existing.name) >= 0.8)

  try {
    const shop = await prisma.shop.create({
      data: { ...shopData, slug: baseSlug },
      include: { owner: { select: { id: true, name: true, avatar: true } } },
    })
    await prisma.shopCustomization.create({
      data: {
        shopId: shop.id,
        draftTheme: 'CLEAN',
        draftLayout: 'CLASSIC',
        draftPrimaryColor: '#FF6B35',
        draftSecondaryColor: '#FFF5E6',
        draftAccentColor: '#2C1F15',
        draftShowReviews: true,
        draftShowCategories: true,
        draftShowFeatured: true,
        draftShowServices: true,
      },
    })
    if (similarShop || officialNameMatch) {
      await prisma.fraudAlert.create({
        data: {
          userId: req.user!.id,
          riskLevel: 'MEDIUM',
          reason: 'New shop name may impersonate an existing seller or verified shop',
          status: 'OPEN',
          metadata: JSON.stringify({ shopId: shop.id, relatedShopId: similarShop?.id || null, relatedUserId: officialNameMatch?.id || null, signal: 'SHOP_NAME_SIMILARITY' }),
        },
      })
    }
    return successResponse(res, shop, 201, 'Shop created successfully')
  } catch (error: any) {
    if (error?.code === 'P2002') return errorResponse(res, 'That shop name is already taken. Please choose another name.', 409)
    throw error
  }
})

const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  logo: z.string().url().optional().or(z.literal('')),
  banner: z.string().url().optional().or(z.literal('')),
  location: z.string().min(2).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  area: z.string().optional().or(z.literal('')),
  campus: z.string().optional().or(z.literal('')),
  openingHours: z.string().min(3).optional(),
  isOpen: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
  pickupAvailable: z.boolean().optional(),
  deliveryFee: z.number().min(0).optional(),
  allowGuestCheckout: z.boolean().optional(),
})

router.patch('/:id', authMiddleware, validateBody(updateShopSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)
  if (shop.ownerId !== req.user!.id && !req.user!.isAdmin) {
    return errorResponse(res, 'Not authorized to update this shop', 403)
  }

  const data: any = { ...req.body }
  if (data.name) {
    try {
      assertModerationSafe(data.name, 'shop name')
    } catch (error: any) {
      return errorResponse(res, 'For your safety, PickAmGo does not allow users to exchange personal contact or payment information for transactions outside the platform. [Edit Message]', 400)
    }
  }
  if (data.description) {
    try {
      assertModerationSafe(data.description, 'shop description')
    } catch (error: any) {
      return errorResponse(res, 'For your safety, PickAmGo does not allow users to exchange personal contact or payment information for transactions outside the platform. [Edit Message]', 400)
    }
  }
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
      where: { ...publicProductVisibility, shopId: req.params.id },
      include: {
        category: { select: { id: true, name: true, emoji: true, color: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        seller: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where: { ...publicProductVisibility, shopId: req.params.id } }),
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
        category: { select: { id: true, name: true, emoji: true, color: true } },
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
        name: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        sellerDeliveryAvailable: true,
        allowGuestCheckout: true,
        platformDeliveryFee: true,
        sellerDeliveryFee: true,
        pickupInstructions: true,
        deliveryZones: true,
        location: true,
        latitude: true,
        longitude: true,
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
