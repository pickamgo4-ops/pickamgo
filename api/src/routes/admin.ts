import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse } from '../types/express'
import { testR2Connection } from '../services/storage'

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

router.get('/dashboard', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingVerifications,
      activeRiders,
      recentOrders,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isSeller: true } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'] } },
      }),
      prisma.sellerVerification.count({ where: { status: 'PENDING' } }),
      prisma.rider.count({ where: { isOnline: true } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, avatar: true } },
          seller: { select: { id: true, name: true, avatar: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, avatar: true, isSeller: true, isRider: true, createdAt: true },
      }),
    ])

    return successResponse(res, {
      stats: {
        totalUsers,
        totalSellers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        pendingVerifications,
        activeRiders,
      },
      recentOrders,
      recentUsers,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch dashboard', 500)
  }
})

router.get('/users', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const role = req.query.role as string | undefined

    const where: any = {}
    if (role === 'seller') where.isSeller = true
    else if (role === 'rider') where.isRider = true
    else if (role === 'admin') where.isAdmin = true

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

router.patch('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { isSeller, isRider, isAdmin } = req.body

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return errorResponse(res, 'User not found', 404)

    const updated = await prisma.user.update({
      where: { id },
      data: { isSeller, isRider, isAdmin },
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

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        include: {
          owner: { select: { id: true, name: true, email: true, avatar: true } },
          _count: { select: { products: true, services: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shop.count(),
    ])

    return successResponse(res, {
      shops,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch shops', 500)
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

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        include: {
          seller: { select: { id: true, name: true, email: true } },
          shop: { select: { id: true, name: true } },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count(),
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
      include: { seller: { select: { id: true, name: true } }, shop: { select: { id: true, name: true } } },
    })

    return successResponse(res, updated, undefined, 'Product updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update product', 500)
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
    const { name, emoji, color, parentId } = req.body

    const category = await prisma.category.create({
      data: { name, emoji: emoji || '', color: color || '', parentId: parentId || null },
    })

    return successResponse(res, category, 201, 'Category created successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to create category', 500)
  }
})

router.patch('/categories/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { name, emoji, color, parentId, isActive } = req.body

    const updated = await prisma.category.update({
      where: { id },
      data: { name, emoji, color, parentId, isActive },
    })

    return successResponse(res, updated, undefined, 'Category updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update category', 500)
  }
})

router.delete('/categories/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    const category = await prisma.category.findUnique({ where: { id } })
    if (!category) return errorResponse(res, 'Category not found', 404)

    await prisma.category.delete({ where: { id } })

    return successResponse(res, null, 200, 'Category deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete category', 500)
  }
})

router.get('/riders', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const riders = await prisma.rider.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(res, riders)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch riders', 500)
  }
})

router.get('/reports', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const [orderStats, topProducts, topSellers] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'name'],
        _sum: { quantity: true },
        _max: { price: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      prisma.order.groupBy({
        by: ['sellerId'],
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
    ])

    const enrichedTopProducts = await Promise.all(
      (topProducts || []).map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId! },
          select: { shop: { select: { name: true } }, seller: { select: { name: true } } },
        })
        return { ...item, product }
      })
    )

    const enrichedTopSellers = await Promise.all(
      (topSellers || []).map(async (item) => {
        const seller = await prisma.user.findUnique({
          where: { id: item.sellerId! },
          select: { name: true, email: true },
        })
        return { ...item, seller }
      })
    )

    return successResponse(res, { orderStats, topProducts: enrichedTopProducts, topSellers: enrichedTopSellers })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch reports', 500)
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

export default router
