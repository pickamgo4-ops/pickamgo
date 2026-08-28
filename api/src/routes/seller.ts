import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse } from '../types/express'

const router = Router()

const productStatus = ['ACTIVE', 'HIDDEN', 'OUT_OF_STOCK', 'ARCHIVED', 'DELETED'] as const

router.get('/categories', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
  if (!shop) return successResponse(res, { categories: [] })
  const categories = await prisma.shopCategory.findMany({ where: { shopId: shop.id }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  return successResponse(res, { categories })
})

router.get('/products/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id }, include: { category: { select: { id: true, name: true, emoji: true, color: true } }, shopCategory: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } } } })
  if (!product) return errorResponse(res, 'Product not found', 404)
  return successResponse(res, product)
})

router.get('/products', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
    if (!shop) return successResponse(res, { products: [] })
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const status = typeof req.query.status === 'string' && productStatus.includes(req.query.status as any) ? req.query.status : undefined
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined
    const where: any = { shopId: shop.id, ...(status ? { status } : { status: { not: 'DELETED' } }) }
    if (search) where.OR = [{ name: { contains: search } }, { description: { contains: search } }]
    if (categoryId) where.shopCategoryId = categoryId
    const sort: any = req.query.sort === 'price' ? { price: 'asc' } : req.query.sort === 'name' ? { name: 'asc' } : req.query.sort === 'stock' ? { stock: 'asc' } : { createdAt: 'desc' }
    const products = await prisma.product.findMany({ where, orderBy: sort, include: { category: { select: { id: true, name: true, emoji: true, color: true } }, shopCategory: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } } } })
    return successResponse(res, { products })
  } catch { return errorResponse(res, 'Failed to fetch seller products', 500) }
})

router.patch('/products/:id/visibility', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const status = req.body?.status
  if (status !== 'ACTIVE' && status !== 'HIDDEN') return errorResponse(res, 'Visibility must be ACTIVE or HIDDEN', 400)
  const product = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } })
  if (!product) return errorResponse(res, 'Product not found', 404)
  const updated = await prisma.product.update({ where: { id: product.id }, data: { status } })
  return successResponse(res, updated, 200, `Product ${status === 'ACTIVE' ? 'shown' : 'hidden'}`)
})

router.patch('/products/:id/stock', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const stock = Number(req.body?.stock)
  if (!Number.isInteger(stock) || stock < 0) return errorResponse(res, 'Stock must be a whole number of zero or more', 400)
  const product = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } })
  if (!product) return errorResponse(res, 'Product not found', 404)
  const updated = await prisma.product.update({ where: { id: product.id }, data: { stock, status: stock === 0 && product.status === 'ACTIVE' ? 'OUT_OF_STOCK' : stock > 0 && product.status === 'OUT_OF_STOCK' ? 'ACTIVE' : product.status } })
  return successResponse(res, updated, 200, 'Stock updated')
})

router.get('/onboarding', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id

    const shop = await prisma.shop.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        logo: true,
        location: true,
        area: true,
        latitude: true,
        longitude: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        status: true,
      },
    })

    const shopId = shop?.id

    const [categoryCount, productCount, verification] = await Promise.all([
      shopId ? prisma.shopCategory.count({ where: { shopId, isActive: true } }) : 0,
      shopId ? prisma.product.count({ where: { shopId, status: 'ACTIVE' } }) : 0,
      prisma.sellerVerification.findUnique({ where: { userId } }),
    ])

    const hasShop = !!shop
    const hasLogo = !!shop?.logo
    const hasLocation = !!(shop?.location && shop.location.trim() !== '')
    const hasCategory = categoryCount > 0
    const hasProducts = productCount > 0
    const hasDelivery = !!(shop?.deliveryAvailable || shop?.pickupAvailable)
    const verificationStatus = verification?.status || 'NOT_SUBMITTED'
    const hasVerification = verificationStatus === 'APPROVED'

    const checks = [
      { key: 'shop', label: 'Create your shop', done: hasShop, href: '/seller/shop/create' },
      { key: 'photo', label: 'Add shop photo', done: hasLogo, href: shop ? `/seller/shop/settings` : '/seller/shop/create' },
      { key: 'location', label: 'Add location', done: hasLocation, href: shop ? `/seller/shop/settings` : '/seller/shop/create' },
      { key: 'category', label: 'Create a category', done: hasCategory, href: shop ? '/seller/categories/new' : '/seller/shop/create' },
      { key: 'product', label: 'Add your first product', done: hasProducts, href: shop ? '/seller/products/new' : '/seller/shop/create' },
      { key: 'delivery', label: 'Set delivery options', done: hasDelivery, href: shop ? `/seller/shop/settings` : '/seller/shop/create' },
      { key: 'verification', label: 'Complete verification', done: hasVerification, status: verificationStatus, href: '/seller/verification' },
    ]

    const completedCount = checks.filter(c => c.done).length

    return successResponse(res, {
      checks,
      progress: { completed: completedCount, total: checks.length },
      summary: {
        hasShop,
        hasLogo,
        hasLocation,
        hasCategory,
        hasProducts,
        hasDelivery,
        verificationStatus,
        hasVerification,
      },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to load onboarding status', 500)
  }
})

router.get('/shop', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user!.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
      },
    })

    if (!shop) {
      return successResponse(res, { shop: null })
    }

    const [productCount, serviceCount, categoryCount, followersCount] = await Promise.all([
      prisma.product.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
      prisma.service.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
      prisma.shopCategory.count({ where: { shopId: shop.id, isActive: true } }),
      prisma.shopFollow.count({ where: { shopId: shop.id } }),
    ])

    return successResponse(res, {
      shop: {
        ...shop,
        productCount,
        serviceCount,
        categoryCount,
        followersCount,
      },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch shop', 500)
  }
})

router.get('/orders', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined

    const where: any = { sellerId: req.user!.id }
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, service: true } },
          customer: { select: { id: true, name: true, avatar: true, phone: true } },
          seller: { select: { id: true, name: true, avatar: true } },
          rider: { select: { id: true, name: true, avatar: true } },
          payment: true,
          delivery: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return successResponse(res, {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch orders', 500)
  }
})

router.get('/bookings', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined

    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
    if (!shop) {
      return successResponse(res, { bookings: [], pagination: { page, limit, total: 0, totalPages: 0 } })
    }

    const where: any = { shopId: shop.id }
    if (status) where.status = status

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: { include: { category: { select: { id: true, name: true, emoji: true, color: true } }, images: true } },
          customer: { select: { id: true, name: true, avatar: true } },
          provider: { select: { id: true, name: true, avatar: true } },
          shop: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return successResponse(res, {
      bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch bookings', 500)
  }
})

router.get('/analytics', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
    if (!shop) {
      return successResponse(res, { shop: null })
    }

    const [totalOrders, totalRevenue, pendingOrders, totalProducts, followersCount, totalReviews] = await Promise.all([
      prisma.order.count({ where: { shopId: shop.id } }),
      prisma.order.aggregate({
        where: { shopId: shop.id, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { shopId: shop.id, status: { in: ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } } }),
      prisma.product.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
      prisma.shopFollow.count({ where: { shopId: shop.id } }),
      prisma.review.count({ where: { targetType: 'SHOP', targetId: shop.id } }),
    ])

    const topProducts = await prisma.product.findMany({
      where: { shopId: shop.id, status: 'ACTIVE' },
      orderBy: { views: { _count: 'desc' } },
      take: 5,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: { select: { id: true, name: true, emoji: true, color: true } },
      },
    })

    const recentOrders = await prisma.order.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { id: true, name: true, avatar: true } },
      },
    })

    return successResponse(res, {
      shop: {
        id: shop.id,
        name: shop.name,
        followersCount,
        rating: shop.rating,
        reviewsCount: shop.reviewsCount,
      },
      stats: {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        pendingOrders,
        totalProducts,
        totalReviews,
        followersCount,
      },
      topProducts,
      recentOrders,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch analytics', 500)
  }
})

router.get('/reviews', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
    if (!shop) {
      return successResponse(res, { reviews: [], averageRating: 0 })
    }

    const reviews = await prisma.review.findMany({
      where: { targetType: 'SHOP', targetId: shop.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

    return successResponse(res, { reviews, averageRating: avgRating })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch reviews', 500)
  }
})

router.get('/inventory', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
    if (!shop) {
      return successResponse(res, { products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { shopId: shop.id, status: { not: 'DELETED' } },
        include: {
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
        orderBy: { stock: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: { shopId: shop.id, status: { not: 'DELETED' } } }),
    ])

    return successResponse(res, {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch inventory', 500)
  }
})

export default router
