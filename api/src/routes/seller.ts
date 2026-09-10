import { Router } from 'express'
import prisma from '../utils/prisma'
import { notifyRestockTransition } from '../services/stock-alerts'
import { reservedQuantity } from '../services/reservations'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse } from '../types/express'

const router = Router()

const productStatus = ['ACTIVE', 'HIDDEN', 'OUT_OF_STOCK', 'ARCHIVED', 'DELETED'] as const

function analyticsRange(query: any) {
  const now = new Date()
  const end = query.end ? new Date(String(query.end)) : now
  const range = String(query.range || '30d')
  let start = new Date(end)
  if (range === 'today') start.setHours(0, 0, 0, 0)
  else if (range === '7d') start.setDate(start.getDate() - 6)
  else if (range === '90d') start.setDate(start.getDate() - 89)
  else if (range === 'custom' && query.start) start = new Date(String(query.start))
  else start.setDate(start.getDate() - 29)
  return { start, end, previousStart: new Date(start.getTime() - (end.getTime() - start.getTime())), previousEnd: new Date(start.getTime() - 1) }
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

async function collectProductAnalytics(productIds: string[], start: Date, end: Date, previousStart: Date, previousEnd: Date) {
  if (!productIds.length) return new Map<string, any>()
  const [views, previousViews, engagements, purchases] = await Promise.all([
    prisma.productView.findMany({ where: { productId: { in: productIds }, createdAt: { gte: start, lte: end } }, select: { productId: true, userId: true, sessionId: true, createdAt: true } }),
    prisma.productView.findMany({ where: { productId: { in: productIds }, createdAt: { gte: previousStart, lte: previousEnd } }, select: { productId: true, userId: true, sessionId: true, createdAt: true } }),
    prisma.productEngagement.findMany({ where: { productId: { in: productIds }, createdAt: { gte: start, lte: end } }, select: { productId: true, userId: true, type: true, createdAt: true } }),
    prisma.orderItem.findMany({ where: { productId: { in: productIds }, order: { isTestOrder: false, status: { notIn: ['CANCELLED', 'FAILED', 'PENDING_PAYMENT'] } }, }, select: { productId: true, quantity: true, order: { select: { createdAt: true } } } }),
  ])
  const result = new Map<string, any>()
  for (const productId of productIds) result.set(productId, { totalViews: 0, uniqueViewers: 0, viewsToday: 0, viewsThisWeek: 0, viewsThisMonth: 0, viewsLast30Days: 0, viewsLast90Days: 0, addToCarts: 0, wishlists: 0, purchases: 0, previousViews: 0, previousPurchases: 0, trend: new Map<string, number>() })
  const viewerKey = (view: any) => view.userId ? `user:${view.userId}` : `session:${view.sessionId}`
  for (const view of views) {
    const item = result.get(view.productId)
    item.totalViews += 1
    item.trend.set(dayKey(view.createdAt), (item.trend.get(dayKey(view.createdAt)) || 0) + 1)
    item._viewers = item._viewers || new Set<string>()
    item._viewers.add(viewerKey(view))
  }
  for (const view of previousViews) {
    const item = result.get(view.productId)
    item.previousViews += 1
  }
  for (const event of engagements) {
    const item = result.get(event.productId)
    if (event.type === 'ADD_TO_CART') item.addToCarts += 1
    if (event.type === 'WISHLIST') item.wishlists += 1
  }
  for (const purchase of purchases) {
    if (!purchase.productId) continue
    const item = result.get(purchase.productId)
    if (purchase.order.createdAt >= start && purchase.order.createdAt <= end) item.purchases += purchase.quantity
    if (purchase.order.createdAt >= previousStart && purchase.order.createdAt <= previousEnd) item.previousPurchases += purchase.quantity
  }
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const week = new Date(now); week.setDate(week.getDate() - 6); week.setHours(0, 0, 0, 0)
  const month = new Date(now); month.setDate(month.getDate() - 29); month.setHours(0, 0, 0, 0)
  const ninety = new Date(now); ninety.setDate(ninety.getDate() - 89); ninety.setHours(0, 0, 0, 0)
  const allViews = await prisma.productView.findMany({ where: { productId: { in: productIds }, createdAt: { gte: ninety, lte: now } }, select: { productId: true, createdAt: true } })
  for (const view of allViews) {
    const item = result.get(view.productId)
    if (view.createdAt >= today) item.viewsToday += 1
    if (view.createdAt >= week) item.viewsThisWeek += 1
    if (view.createdAt >= month) item.viewsThisMonth += 1
    item.viewsLast30Days = item.viewsThisMonth
    if (view.createdAt >= ninety) item.viewsLast90Days += 1
  }
  for (const item of result.values()) {
    item.uniqueViewers = item._viewers?.size || 0
    item.conversionRate = item.totalViews ? Number(((item.purchases / item.totalViews) * 100).toFixed(2)) : 0
    item.previousConversionRate = item.previousViews ? Number(((item.previousPurchases / item.previousViews) * 100).toFixed(2)) : 0
    delete item._viewers
  }
  return result
}

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
    const products = await prisma.product.findMany({ where, orderBy: sort, include: { category: { select: { id: true, name: true, emoji: true, color: true } }, shopCategory: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } }, _count: { select: { views: true } } } })
    return successResponse(res, { products })
  } catch { return errorResponse(res, 'Failed to fetch seller products', 500) }
})

router.patch('/products/:id/visibility', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const status = req.body?.status
  if (status !== 'ACTIVE' && status !== 'HIDDEN') return errorResponse(res, 'Visibility must be ACTIVE or HIDDEN', 400)
  const product = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } })
  if (!product) return errorResponse(res, 'Product not found', 404)
  if (product.status === 'SUSPENDED' || product.status === 'REMOVED') return errorResponse(res, 'This product status can only be changed by an administrator', 403)
  const updated = await prisma.product.update({ where: { id: product.id }, data: { status } })
  return successResponse(res, updated, 200, `Product ${status === 'ACTIVE' ? 'shown' : 'hidden'}`)
})

router.patch('/products/:id/stock', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const stock = Number(req.body?.stock)
  if (!Number.isInteger(stock) || stock < 0) return errorResponse(res, 'Stock must be a whole number of zero or more', 400)
  try {
    const { product, updated } = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${req.params.id} FOR UPDATE`
      const current = await tx.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } })
      if (!current) throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' })
      const reserved = await reservedQuantity(tx, current.id)
      if (stock < reserved) throw Object.assign(new Error(`Stock cannot be reduced below ${reserved} units currently reserved by buyers`), { code: 'RESERVED_STOCK' })
      const changed = await tx.product.update({ where: { id: current.id }, data: { stock, status: stock === 0 && current.status === 'ACTIVE' ? 'OUT_OF_STOCK' : stock > 0 && current.status === 'OUT_OF_STOCK' ? 'ACTIVE' : current.status } })
      return { product: current, updated: changed }
    })
    await notifyRestockTransition(prisma, product.id, product.stock, updated.stock)
    return successResponse(res, updated, 200, 'Stock updated')
  } catch (error: any) {
    if (error?.code === 'NOT_FOUND') return errorResponse(res, error.message, 404)
    if (error?.code === 'RESERVED_STOCK') return errorResponse(res, error.message, 409)
    return errorResponse(res, 'Failed to update stock', 500)
  }
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
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const shops = await prisma.shop.findMany({ where: { ownerId: req.user!.id }, select: { id: true } })
    const shopIds = shops.map(shop => shop.id)
    const [products, services] = shopIds.length
      ? await Promise.all([
          prisma.product.findMany({ where: { shopId: { in: shopIds } }, select: { id: true } }),
          prisma.service.findMany({ where: { shopId: { in: shopIds } }, select: { id: true } }),
        ])
      : [[], []]
    const productIds = products.map(product => product.id)
    const serviceIds = services.map(service => service.id)
    const sellerOrderScope = [
      { sellerId: req.user!.id },
      ...(shopIds.length ? [{ shopId: { in: shopIds } }] : []),
      ...(productIds.length ? [{ items: { some: { productId: { in: productIds } } } }] : []),
      ...(serviceIds.length ? [{ items: { some: { serviceId: { in: serviceIds } } } }] : []),
    ]
    const where: any = {
      OR: [
        ...sellerOrderScope,
      ],
    }
    if (status) where.status = status
    if (search) {
      where.AND = [{ OR: sellerOrderScope }, {
        OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
        ],
      }]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          guestName: true,
          guestPhone: true,
          total: true,
          status: true,
          deliveryAddress: true,
          fulfillmentMethod: true,
          createdAt: true,
          items: { select: {
            id: true,
            name: true,
            quantity: true,
            product: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          } },
          customer: { select: { id: true, name: true, avatar: true, phone: true } },
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
    console.error('Failed to fetch seller orders:', error)
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

    const [totalOrders, totalRevenue, pendingOrders, totalProducts, followersCount, totalReviews, customerOrders, offersReceived, offersAccepted, offersRejected, acceptedOfferRevenue, priceAlertInterest] = await Promise.all([
      prisma.order.count({ where: { shopId: shop.id, isTestOrder: false } }),
      prisma.order.aggregate({
        where: { shopId: shop.id, isTestOrder: false, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { shopId: shop.id, isTestOrder: false, status: { in: ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } } }),
      prisma.product.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
      prisma.shopFollow.count({ where: { shopId: shop.id } }),
      prisma.review.count({ where: { targetType: 'SHOP', targetId: shop.id } }),
      prisma.order.findMany({ where: { shopId: shop.id, isTestOrder: false, customerId: { not: null } }, select: { customerId: true }, distinct: ['customerId'] }),
      prisma.productOffer.count({ where: { sellerId: req.user!.id } }),
      prisma.productOffer.count({ where: { sellerId: req.user!.id, status: 'ACCEPTED' } }),
      prisma.productOffer.count({ where: { sellerId: req.user!.id, status: 'REJECTED' } }),
      prisma.productOffer.aggregate({ where: { sellerId: req.user!.id }, _sum: { offerAmount: true }, _avg: { offerAmount: true } }),
      prisma.productPriceAlert.count({ where: { active: true, product: { sellerId: req.user!.id } } }),
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
        offersReceived,
        offersAccepted,
        offersRejected,
        offerAcceptanceRate: offersReceived ? Number(((offersAccepted / offersReceived) * 100).toFixed(2)) : 0,
        averageOfferAmount: Number(acceptedOfferRevenue._avg.offerAmount || 0),
        revenueFromAcceptedOffers: Number(acceptedOfferRevenue._sum.offerAmount || 0),
        activePriceAlertInterest: priceAlertInterest,
        totalCustomers: customerOrders.length,
        rating: shop.rating,
        reviewsCount: shop.reviewsCount,
      },
      stats: {
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        pendingOrders,
        totalProducts,
        totalReviews,
        followersCount,
      },
      topProducts: topProducts.map(product => ({ ...product, price: Number(product.price), originalPrice: product.originalPrice == null ? null : Number(product.originalPrice) })),
      recentOrders: recentOrders.map(order => ({ ...order, total: Number(order.total), deliveryFee: Number(order.deliveryFee) })),
    })
  } catch (error: any) {
    console.error('Analytics error:', error)
    return errorResponse(res, error?.message || 'Failed to fetch analytics', 500)
  }
})

router.get('/analytics/product-views', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id }, select: { id: true } })
    if (!shop) return successResponse(res, { products: [], summary: null, trend: [], range: req.query.range || '30d' })
    const { start, end, previousStart, previousEnd } = analyticsRange(req.query)
    const products = await prisma.product.findMany({ where: { shopId: shop.id, status: { not: 'DELETED' } }, select: { id: true, name: true, price: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } })
    const metrics = await collectProductAnalytics(products.map(product => product.id), start, end, previousStart, previousEnd)
    const rows = products.map(product => ({ ...product, price: Number(product.price), analytics: metrics.get(product.id) })).sort((a, b) => b.analytics.totalViews - a.analytics.totalViews)
    const summary = rows.reduce((total, row) => ({ totalViews: total.totalViews + row.analytics.totalViews, uniqueViewers: total.uniqueViewers + row.analytics.uniqueViewers, addToCarts: total.addToCarts + row.analytics.addToCarts, wishlists: total.wishlists + row.analytics.wishlists, purchases: total.purchases + row.analytics.purchases, previousViews: total.previousViews + row.analytics.previousViews }), { totalViews: 0, uniqueViewers: 0, addToCarts: 0, wishlists: 0, purchases: 0, previousViews: 0 })
    const trendMap = new Map<string, number>()
    for (const row of rows) for (const [day, count] of metrics.get(row.id)?.trend || []) trendMap.set(day, (trendMap.get(day) || 0) + Number(count))
    const trend = Array.from(trendMap, ([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date))
    return successResponse(res, { products: rows.map(({ id, name, price, images, analytics }) => ({ id, name, price, image: images[0]?.url || '', ...analytics, trend: Array.from(analytics.trend, ([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date)), comparison: { views: percentChange(analytics.totalViews, analytics.previousViews), purchases: percentChange(analytics.purchases, analytics.previousPurchases) } })), summary: { ...summary, conversionRate: summary.totalViews ? Number(((summary.purchases / summary.totalViews) * 100).toFixed(2)) : 0, comparison: percentChange(summary.totalViews, summary.previousViews) }, trend, range: { start, end, previousStart, previousEnd } })
  } catch (error) {
    console.error('Product view analytics error:', error)
    return errorResponse(res, 'Failed to fetch product analytics', 500)
  }
})

router.get('/analytics/products/:productId', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.productId, sellerId: req.user!.id }, select: { id: true, name: true, price: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } })
    if (!product) return errorResponse(res, 'Product not found', 404)
    const { start, end, previousStart, previousEnd } = analyticsRange(req.query)
    const analytics = (await collectProductAnalytics([product.id], start, end, previousStart, previousEnd)).get(product.id)
    const trend = Array.from(analytics.trend, ([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date))
    const bestDays = [...trend].sort((a, b) => b.views - a.views).slice(0, 5)
    return successResponse(res, { product: { id: product.id, name: product.name, price: Number(product.price), image: product.images[0]?.url || '' }, analytics: { ...analytics, trend, bestDays, comparison: { views: percentChange(analytics.totalViews, analytics.previousViews), purchases: percentChange(analytics.purchases, analytics.previousPurchases) }, range: { start, end, previousStart, previousEnd } } })
  } catch (error) {
    console.error('Product detail analytics error:', error)
    return errorResponse(res, 'Failed to fetch product analytics', 500)
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

router.get('/trust', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id

    const [verificationResult, riskResult, freezeResult] = await Promise.allSettled([
      prisma.sellerVerification.findFirst({ where: { userId, type: 'SELLER' } }),
      prisma.sellerRisk.findUnique({ where: { userId } }),
      prisma.sellerPayoutFreeze.findFirst({ where: { userId, thawedAt: null } }),
    ])
    const verification = verificationResult.status === 'fulfilled' ? verificationResult.value : null
    const risk = riskResult.status === 'fulfilled' ? riskResult.value : null
    const freeze = freezeResult.status === 'fulfilled' ? freezeResult.value : null

    let verificationStatus: string = 'NOT_SUBMITTED'
    let canSell = true
    const restrictions: string[] = []

    if (verification) {
      verificationStatus = verification.status
      if (verification.status === 'PENDING' || verification.status === 'SUSPENDED') {
        canSell = false
      }
      if (verification.reviewStatus === 'UNDER_REVIEW') {
        restrictions.push('Account under review by admin')
      }
    } else {
      canSell = false
      restrictions.push('Complete seller verification to sell')
    }

    if (freeze) {
      canSell = false
      restrictions.push(`Payouts frozen: ${freeze.reason || 'Security reasons'}`)
    }

    if (risk) {
      if (risk.riskLevel === 'HIGH') {
        restrictions.push('High risk level - some features may be limited')
      }
    }

    const trustInfo = {
      verificationStatus,
      reviewStatus: verification?.reviewStatus || null,
      verificationMethod: verification?.verificationMethod || null,
      trustScore: risk?.trustScore || 50,
      riskLevel: risk?.riskLevel || 'NORMAL',
      isPayoutFrozen: !!freeze,
      payoutFreezeReason: freeze?.reason || null,
      canSell,
      restrictions,
      verificationDate: verification?.verificationDate || null,
      verificationProvider: verification?.verificationProvider || null,
      verificationReference: verification?.verificationReference || null,
    }

    return successResponse(res, trustInfo)
  } catch (error) {
    console.error('Failed to fetch trust info:', error)
    return errorResponse(res, 'Failed to fetch trust info', 500)
  }
})

router.get('/tour/status', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { sellerTourStatus: true },
    })
    return successResponse(res, { status: user?.sellerTourStatus || 'NOT_STARTED' })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch tour status', 500)
  }
})

router.post('/tour/status', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.body?.status
    if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'].includes(status)) {
      return errorResponse(res, 'Invalid tour status', 400)
    }
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { sellerTourStatus: status },
    })
    return successResponse(res, { status })
  } catch (error) {
    return errorResponse(res, 'Failed to update tour status', 500)
  }
})

export default router
