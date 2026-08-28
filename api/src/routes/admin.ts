import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { testR2Connection } from '../services/storage'
import { z } from 'zod'

const router = Router()

router.get('/r2-test', authMiddleware, requireRole(['ADMIN']), async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await testR2Connection()
    return successResponse(res, {
      r2Connected: true,
      bucket: result.bucket,
      message: 'Cloudflare R2 connection, upload, read and delete all work successfully.',
    })
  } catch (error: any) {
    console.error('R2 connection test failed:', error)
    return res.status(500).json({
      success: false,
      r2Connected: false,
      error: error?.message || 'Cloudflare R2 connection test failed.',
    })
  }
})

const dashboardSchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'all']).default('30d').optional(),
}).optional()

router.get('/dashboard', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalUsers,
      totalBuyers,
      totalSellers,
      totalRiders,
      totalAdmins,
      totalShops,
      totalProducts,
      totalServices,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      pendingSellerVerifications,
      pendingShopApprovals,
      pendingRiderVerifications,
      activeRiders,
      pendingPayouts,
      completedDeliveries,
      activeDeliveries,
      todayOrders,
      todayRevenue,
      recentOrders,
      recentUsers,
      orderStatusBreakdown,
      revenueBreakdown,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isSeller: false, isRider: false, isAdmin: false } }),
      prisma.user.count({ where: { isSeller: true } }),
      prisma.user.count({ where: { isRider: true } }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.shop.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.service.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { payment: { status: 'PAID' } },
      }),
      prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.sellerVerification.count({ where: { status: 'PENDING', type: 'SELLER' } }),
      prisma.shop.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.sellerVerification.count({ where: { status: 'PENDING', type: 'RIDER' } }),
      prisma.rider.count({ where: { isOnline: true } }),
      prisma.payout.count({ where: { status: 'PENDING' } }),
      prisma.delivery.count({ where: { status: 'DELIVERED' } }),
      prisma.delivery.count({ where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      prisma.order.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, payment: { status: 'PAID' } },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, avatar: true } },
          seller: { select: { id: true, name: true, avatar: true } },
          shop: { select: { id: true, name: true } },
          payment: { select: { status: true, method: true } },
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, avatar: true, isSeller: true, isRider: true, isAdmin: true, createdAt: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.financialLedger.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { type: 'PLATFORM_COMMISSION' },
      }),
    ])

    const platformCommission = revenueBreakdown.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0)

    return successResponse(res, {
      stats: {
        totalUsers,
        totalBuyers,
        totalSellers,
        totalRiders,
        totalAdmins,
        totalShops,
        totalProducts,
        totalServices,
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        pendingOrders,
        completedOrders,
        cancelledOrders,
        pendingSellerVerifications,
        pendingShopApprovals,
        pendingRiderVerifications,
        activeRiders,
        pendingPayouts,
        completedDeliveries,
        activeDeliveries,
        todayOrders,
        todayRevenue: Number(todayRevenue._sum.total || 0),
        platformCommission,
      },
      recentOrders,
      recentUsers,
      orderStatusBreakdown,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return errorResponse(res, 'Failed to fetch dashboard', 500)
  }
})

router.get('/users', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const role = req.query.role as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (role === 'seller') where.isSeller = true
    else if (role === 'rider') where.isRider = true
    else if (role === 'admin') where.isAdmin = true
    else if (role === 'buyer') { where.isSeller = false; where.isRider = false; where.isAdmin = false }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          location: true,
          isSeller: true,
          isRider: true,
          isAdmin: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return successResponse(res, {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch users', 500)
  }
})

router.get('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        location: true,
        isSeller: true,
        isRider: true,
        isAdmin: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
        verification: true,
        riderProfile: true,
        _count: {
          select: {
            customerOrders: true,
            sellerOrders: true,
            products: true,
            services: true,
            favorites: true,
          },
        },
      },
    })

    if (!user) return errorResponse(res, 'User not found', 404)

    return successResponse(res, user)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch user', 500)
  }
})

router.patch('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { isSeller, isRider, isAdmin } = req.body

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return errorResponse(res, 'User not found', 404)

    const updated = await prisma.user.update({
      where: { id },
      data: { isSeller: !!isSeller, isRider: !!isRider, isAdmin: !!isAdmin },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        location: true,
        isSeller: true,
        isRider: true,
        isAdmin: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    return successResponse(res, updated, undefined, 'User updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update user', 500)
  }
})

router.get('/shops', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (status) where.status = status

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, avatar: true } },
          _count: { select: { products: true, services: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shop.count({ where }),
    ])

    return successResponse(res, {
      shops: shops.map(shop => ({
        ...shop,
      publicUrl: `${(req as any).headers?.host?.includes('localhost') ? '' : 'https://'}${shop.slug}.${process.env.MARKETPLACE_DOMAIN || 'pickamgo.com'}`,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch shops', 500)
  }
})

router.get('/shops/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        products: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
        services: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
        orders: { take: 5, orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, name: true } }, payment: true } },
        _count: { select: { products: true, services: true, orders: true } },
      },
    })

    if (!shop) return errorResponse(res, 'Shop not found', 404)

    return successResponse(res, {
      ...shop,
      publicUrl: `${(req as any).headers?.host?.includes('localhost') ? '' : 'https://'}${shop.slug}.${process.env.MARKETPLACE_DOMAIN || 'pickamgo.com'}`,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch shop', 500)
  }
})

router.patch('/shops/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { status, isVerified, verificationStatus } = req.body

    const shop = await prisma.shop.findUnique({ where: { id } })
    if (!shop) return errorResponse(res, 'Shop not found', 404)

    const updated = await prisma.shop.update({
      where: { id },
      data: { status, isVerified, verificationStatus },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })

    return successResponse(res, updated, undefined, 'Shop updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update shop', 500)
  }
})

router.get('/products', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined
    const category = req.query.category as string | undefined

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shop: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (status) where.status = status
    if (category) where.categoryId = category

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          shop: { select: { id: true, name: true } },
          category: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return successResponse(res, {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch products', 500)
  }
})

router.patch('/products/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return errorResponse(res, 'Product not found', 404)

    const updated = await prisma.product.update({
      where: { id },
      data: { status },
      include: { seller: { select: { id: true, name: true } }, shop: { select: { id: true, name: true } }, category: true },
    })

    return successResponse(res, updated, undefined, 'Product updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update product', 500)
  }
})

router.delete('/products/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return errorResponse(res, 'Product not found', 404)

    await prisma.product.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 200, 'Product deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete product', 500)
  }
})

router.get('/products/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true, slug: true } },
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!product) return errorResponse(res, 'Product not found', 404)
    return successResponse(res, product)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch product', 500)
  }
})

router.get('/categories', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { parent: true, _count: { select: { products: true, services: true } } },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    })

    return successResponse(res, categories)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch categories', 500)
  }
})

router.post('/categories', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, icon, color, parentId } = req.body

    const category = await prisma.category.create({
      data: { name, emoji: icon || '', color: color || '', parentId: parentId || null },
    })

    return successResponse(res, category, 201, 'Category created successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to create category', 500)
  }
})

router.patch('/categories/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { name, icon, color, parentId, isActive } = req.body

    const updated = await prisma.category.update({
      where: { id },
      data: { name, emoji: icon, color, parentId, isActive },
    })

    return successResponse(res, updated, undefined, 'Category updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update category', 500)
  }
})

router.delete('/categories/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!category) return errorResponse(res, 'Category not found', 404)

    const productCount = await prisma.product.count({ where: { categoryId: req.params.id } })
    if (productCount > 0) {
      return errorResponse(res, `Cannot delete category with ${productCount} products. Reassign products first.`, 409)
    }

    await prisma.category.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 200, 'Category deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete category', 500)
  }
})

router.get('/orders', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { shop: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, service: true } },
          customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          seller: { select: { id: true, name: true, email: true } },
          shop: { select: { id: true, name: true } },
          rider: { select: { id: true, name: true, email: true } },
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

router.get('/orders/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true, service: true } },
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        seller: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true, location: true, latitude: true, longitude: true } },
        rider: { select: { id: true, name: true, email: true } },
        payment: true,
        delivery: true,
        sellerEarnings: true,
        riderEarnings: true,
      },
    })

    if (!order) return errorResponse(res, 'Order not found', 404)

    return successResponse(res, order)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch order', 500)
  }
})

router.patch('/orders/:id/status', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return errorResponse(res, 'Order not found', 404)

    const updated = await prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true } },
      },
    })

    return successResponse(res, updated, undefined, 'Order status updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update order status', 500)
  }
})

router.get('/riders', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string | undefined
    const verified = req.query.verified as string | undefined
    const online = req.query.online as string | undefined

    const where: any = {}
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    }
    if (verified === 'true') where.isVerified = true
    else if (verified === 'false') where.isVerified = false
    if (online === 'true') { where.isOnline = true; where.isAvailable = true }
    else if (online === 'false') { where.OR = [{ isOnline: false }, { isAvailable: false }] }

    const [riders, total] = await Promise.all([
      prisma.rider.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.rider.count({ where }),
    ])

    const mapped = riders.map(rider => ({
      ...rider,
      deliveriesCount: Number(rider.deliveriesCount) || 0,
      earnings: Number(rider.earnings) || 0,
      rating: Number(rider.rating) || 0,
    }))

    return successResponse(res, {
      riders: mapped,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Failed to fetch riders:', error)
    return errorResponse(res, 'Failed to fetch riders', 500)
  }
})

router.get('/riders/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const rider = await prisma.rider.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } },
      },
    })

    if (!rider) return errorResponse(res, 'Rider not found', 404)

    const deliveries = await prisma.delivery.findMany({
      where: { riderId: rider.userId },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { orderNumber: true, status: true, total: true } } },
    })

    const earnings = await prisma.riderEarnings.findMany({
      where: { riderId: rider.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return successResponse(res, { ...rider, deliveries, earnings })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch rider', 500)
  }
})

router.patch('/riders/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { isOnline, isAvailable, isVerified } = req.body

    const rider = await prisma.rider.findUnique({ where: { id } })
    if (!rider) return errorResponse(res, 'Rider not found', 404)

    const updated = await prisma.rider.update({
      where: { id },
      data: { isOnline: !!isOnline, isAvailable: !!isAvailable, isVerified: !!isVerified },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return successResponse(res, updated, undefined, 'Rider updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update rider', 500)
  }
})

router.get('/verifications', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string | undefined
    const type = req.query.type as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    const verifications = await prisma.sellerVerification.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, location: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return successResponse(res, verifications)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch verifications', 500)
  }
})

router.patch('/verifications/:id/status', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400)
    }

    const verification = await prisma.sellerVerification.findUnique({ where: { id } })
    if (!verification) return errorResponse(res, 'Verification not found', 404)

    const updated = await prisma.sellerVerification.update({
      where: { id },
      data: {
        status,
        rejectionReason: rejectionReason || null,
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (status === 'APPROVED' && verification.type === 'RIDER') {
      await prisma.rider.updateMany({
        where: { userId: verification.userId },
        data: { isVerified: true },
      })
    } else if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isSeller: true },
      })
      await prisma.shop.updateMany({
        where: { ownerId: verification.userId },
        data: { isVerified: true, verificationStatus: 'APPROVED' },
      })
    }

    return successResponse(res, updated, undefined, `Verification ${status.toLowerCase()}`)
  } catch (error) {
    return errorResponse(res, 'Failed to update verification status', 500)
  }
})

router.get('/payouts', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          payoutMethod: { select: { provider: true, phoneNumber: true, accountName: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payout.count({ where }),
    ])

    return successResponse(res, {
      payouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch payouts', 500)
  }
})

router.get('/payments', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { transactionRef: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              total: true,
              customer: { select: { name: true, email: true } },
              shop: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ])

    return successResponse(res, {
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch payments', 500)
  }
})

router.get('/settings', authMiddleware, requireRole(['ADMIN']), async (_req: AuthenticatedRequest, res) => {
  try {
    const dbSettings = await prisma.setting.findMany()
    const settingMap = new Map(dbSettings.map(s => [s.key, s.value]))

    const settings = {
      general: {
        platformName: settingMap.get('platformName') || 'PickAmGo',
        supportEmail: settingMap.get('supportEmail') || process.env.ADMIN_NOTIFICATION_EMAIL || 'support@pickamgo.com',
        supportPhone: settingMap.get('supportPhone') || '',
        defaultCurrency: settingMap.get('defaultCurrency') || 'GHS',
        defaultCountry: settingMap.get('defaultCountry') || 'Ghana',
        timezone: settingMap.get('timezone') || 'Africa/Accra',
        maintenanceMode: settingMap.get('maintenanceMode') === 'true',
        enableRegistrations: settingMap.get('enableRegistrations') !== 'false',
      },
      marketplace: {
        enableSellers: settingMap.get('enableSellers') !== 'false',
        enableRiders: settingMap.get('enableRiders') !== 'false',
        enableGuestCheckout: settingMap.get('enableGuestCheckout') !== 'false',
        enableShopCreation: settingMap.get('enableShopCreation') !== 'false',
        enableMessaging: settingMap.get('enableMessaging') !== 'false',
        enableReviews: settingMap.get('enableReviews') !== 'false',
        enableWishlist: settingMap.get('enableWishlist') !== 'false',
        enableFollowing: settingMap.get('enableFollowing') !== 'false',
        enableBookings: settingMap.get('enableBookings') !== 'false',
      },
      commission: {
        sellerCommission: parseFloat(settingMap.get('sellerCommission') || '7'),
        riderCommission: parseFloat(settingMap.get('riderCommission') || '0'),
        minimumWithdrawal: parseFloat(settingMap.get('minimumWithdrawal') || '50'),
      },
      payment: {
        paystackConfigured: !!process.env.PAYSTACK_SECRET_KEY,
        paymentCurrency: settingMap.get('paymentCurrency') || 'GHS',
        minimumPayout: parseFloat(settingMap.get('minimumPayout') || '50'),
      },
      delivery: {
        deliveryEnabled: settingMap.get('deliveryEnabled') !== 'false',
        minimumDeliveryFee: parseFloat(settingMap.get('minimumDeliveryFee') || '0'),
        maximumDeliveryFee: parseFloat(settingMap.get('maximumDeliveryFee') || '100'),
        riderApprovalRequired: settingMap.get('riderApprovalRequired') !== 'false',
      },
      security: {
        emailLoginEnabled: settingMap.get('emailLoginEnabled') !== 'false',
        googleLoginEnabled: !!process.env.GOOGLE_CLIENT_ID,
        phoneVerificationEnabled: settingMap.get('phoneVerificationEnabled') === 'true',
      },
      notifications: {
        emailNotifications: settingMap.get('emailNotifications') !== 'false',
        orderNotifications: settingMap.get('orderNotifications') !== 'false',
        newSellerNotifications: settingMap.get('newSellerNotifications') !== 'false',
        newRiderNotifications: settingMap.get('newRiderNotifications') !== 'false',
        paymentNotifications: settingMap.get('paymentNotifications') !== 'false',
        withdrawalNotifications: settingMap.get('withdrawalNotifications') !== 'false',
        deliveryNotifications: settingMap.get('deliveryNotifications') !== 'false',
        supportNotifications: settingMap.get('supportNotifications') !== 'false',
      },
      email: {
        providerConfigured: !!process.env.RESEND_API_KEY,
        senderEmail: process.env.RESEND_API_KEY ? 'noreply@pickamgo.com' : '',
        senderName: settingMap.get('senderName') || 'PickAmGo',
      },
    }

    return successResponse(res, settings)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch settings', 500)
  }
})

router.patch('/settings', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body as Record<string, any>
    const updatedBy = req.user?.id || 'system'

    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'boolean' ? String(value) : String(value)
      await prisma.setting.upsert({
        where: { key },
        update: { value: stringValue, updatedBy },
        create: { key, value: stringValue, updatedBy },
      })
    }

    return successResponse(res, null, 200, 'Settings updated successfully')
  } catch (error) {
    console.error('Failed to update settings:', error)
    return errorResponse(res, 'Failed to update settings', 500)
  }
})

router.get('/features', authMiddleware, requireRole(['ADMIN']), async (_req: AuthenticatedRequest, res) => {
  try {
    const dbSettings = await prisma.setting.findMany()
    const settingMap = new Map(dbSettings.map(s => [s.key, s.value]))

    const features = {
      googleAuth: !!process.env.GOOGLE_CLIENT_ID,
      paystack: !!process.env.PAYSTACK_SECRET_KEY,
      r2: !!process.env.R2_ACCOUNT_ID,
      email: !!process.env.RESEND_API_KEY,
      enableSellers: settingMap.get('enableSellers') !== 'false',
      enableRiders: settingMap.get('enableRiders') !== 'false',
      enableGuestCheckout: settingMap.get('enableGuestCheckout') !== 'false',
      enableShopCreation: settingMap.get('enableShopCreation') !== 'false',
      enableMessaging: settingMap.get('enableMessaging') !== 'false',
      enableReviews: settingMap.get('enableReviews') !== 'false',
      enableWishlist: settingMap.get('enableWishlist') !== 'false',
      enableFollowing: settingMap.get('enableFollowing') !== 'false',
      enableBookings: settingMap.get('enableBookings') !== 'false',
    }

    return successResponse(res, features)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch features', 500)
  }
})

router.get('/environment', authMiddleware, requireRole(['ADMIN']), async (_req: AuthenticatedRequest, res) => {
  try {
    const environment = {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
      nodeEnv: process.env.NODE_ENV || 'development',
      database: 'connected',
      redis: process.env.REDIS_URL ? 'connected' : 'disconnected',
    }

    return successResponse(res, environment)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch environment', 500)
  }
})

router.post('/shops/backfill-slugs', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { slug: { equals: '' } },
      select: { id: true, name: true },
    })

    let updated = 0
    for (const shop of shops) {
      const baseSlug = shop.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'shop'

      let slug = baseSlug
      let attempt = 1

      while (attempt < 10) {
        const existing = await prisma.shop.findFirst({
          where: { slug, id: { not: shop.id } },
        })
        if (!existing) break
        slug = `${baseSlug}-${attempt + 1}`
        attempt++
      }

      await prisma.shop.update({
        where: { id: shop.id },
        data: { slug },
      })

      updated++
    }

    return successResponse(res, { updated, total: shops.length }, 200, `Backfilled ${updated} shop slugs`)
  } catch (error) {
    return errorResponse(res, 'Failed to backfill shop slugs', 500)
  }
})

router.get('/deliveries', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.order = {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              customer: { select: { id: true, name: true, email: true } },
              shop: { select: { id: true, name: true } },
            },
          },
          rider: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ])

    return successResponse(res, {
      deliveries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch deliveries', 500)
  }
})

router.get('/bookings', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { service: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { provider: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: { include: { category: true, images: true } },
          customer: { select: { id: true, name: true, email: true, avatar: true } },
          provider: { select: { id: true, name: true, email: true, avatar: true } },
          shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
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

router.get('/conversations', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string | undefined

    const conversations = await prisma.conversation.findMany({
      include: {
        participant1: { select: { id: true, name: true, email: true, avatar: true } },
        participant2: { select: { id: true, name: true, email: true, avatar: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.conversation.count()

    const mapped = conversations.map((conversation) => ({
      id: conversation.id,
      participant1: conversation.participant1,
      participant2: conversation.participant2,
      order: conversation.order,
      shopId: conversation.shopId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessage: conversation.messages[0] || null,
      totalMessages: conversation._count.messages,
    }))

    return successResponse(res, {
      conversations: mapped,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch conversations', 500)
  }
})

router.get('/reviews', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const targetType = req.query.targetType as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (targetType) where.targetType = targetType
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    return successResponse(res, {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch reviews', 500)
  }
})

router.get('/notifications', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const isRead = req.query.isRead as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (isRead !== undefined) where.isRead = isRead === 'true'
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ])

    return successResponse(res, {
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch notifications', 500)
  }
})

router.patch('/notifications/:id/read', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification) return errorResponse(res, 'Notification not found', 404)

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    })

    return successResponse(res, updated, undefined, 'Notification marked as read')
  } catch (error) {
    return errorResponse(res, 'Failed to update notification', 500)
  }
})

router.patch('/notifications/read-all', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    })

    return successResponse(res, null, 200, 'All notifications marked as read')
  } catch (error) {
    return errorResponse(res, 'Failed to update notifications', 500)
  }
})

router.delete('/notifications/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification) return errorResponse(res, 'Notification not found', 404)

    await prisma.notification.delete({ where: { id: req.params.id } })

    return successResponse(res, null, 200, 'Notification deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete notification', 500)
  }
})

export default router
