import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody, validateQuery } from '../types/express'
import { distanceInKm } from '../utils/geo'
import { publicProductVisibility } from '../utils/visibility'

const router = Router()
const imageUrl = z.string().refine(value => value.startsWith('/') || /^https?:\/\//.test(value), 'Invalid image URL')

function generateSku(sellerId: string, productId?: string): string {
  const prefix = 'PGH'
  const sellerPrefix = sellerId.substring(0, 4).toUpperCase()
  const productPart = productId ? productId.substring(0, 8) : Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${sellerPrefix}-${productPart}-${randomPart}`
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100)
}

const listProductsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  area: z.string().optional(),
  campus: z.string().optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc', 'rating', 'newest']).default('relevance'),
  type: z.enum(['product', 'service']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100).default(25),
})

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  shortDescription: z.string().optional(),
  sku: z.string().optional(),
  slug: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  originalPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0).default(0),
  categoryId: z.string().min(1, 'Category ID is required'),
  shopId: z.string().min(1, 'Shop ID is required'),
  shopCategoryId: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  area: z.string().optional(),
  campus: z.string().optional(),
  condition: z.string().default('new'),
  draft: z.boolean().optional(),
  publishedAt: z.coerce.date().optional(),
  images: z.array(imageUrl).default([]),
  isTrending: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isDeal: z.boolean().optional(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  sku: z.string().optional(),
  slug: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().min(1).optional(),
  shopCategoryId: z.string().optional(),
  location: z.string().min(1).optional(),
  area: z.string().optional(),
  campus: z.string().optional(),
  condition: z.string().optional(),
  draft: z.boolean().optional(),
  publishedAt: z.coerce.date().optional(),
  images: z.array(imageUrl).optional(),
  isTrending: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isDeal: z.boolean().optional(),
})

router.get('/', validateQuery(listProductsQuerySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      page,
      limit,
      category,
      search,
      minPrice,
      maxPrice,
      location,
      area,
      campus,
      sort,
      latitude,
      longitude,
      radius,
    } = req.query as z.infer<typeof listProductsQuerySchema>

    const where: any = { ...publicProductVisibility, draft: false }

    const shopStatusOk = await prisma.shop.count({ where: { status: 'ACTIVE' } })
    if (shopStatusOk === 0) {
      return successResponse(res, { products: [], total: 0, page, limit, totalPages: 0 })
    }

    where.shop = { status: 'ACTIVE' }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { shop: { name: { contains: search, mode: 'insensitive' } } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: minPrice }
    }
    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice }
    }

    if (category) {
      where.categoryId = category
    }

    if (location) {
      where.AND = [...(where.AND || []), { OR: [{ location: { contains: location, mode: 'insensitive' } }, { shop: { location: { contains: location, mode: 'insensitive' } } }] }]
    }
    if (area) {
      where.area = { contains: area }
    }
    if (campus) {
      where.campus = { contains: campus }
    }

    let orderBy: any = { createdAt: 'desc' }
    switch (sort) {
      case 'price-asc':
        orderBy = { price: 'asc' }
        break
      case 'price-desc':
        orderBy = { price: 'desc' }
        break
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
            },
          },
          shop: true,
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    const productsWithDistance: any[] = latitude !== undefined && longitude !== undefined
      ? products
        .map(product => {
          const distance = product.shop?.latitude != null && product.shop?.longitude != null
            ? distanceInKm({ latitude, longitude }, { latitude: product.shop.latitude, longitude: product.shop.longitude })
            : null
          return { ...product, distanceKm: distance }
        })
        .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))
      : products
    const nearbyProducts: any[] = latitude !== undefined && longitude !== undefined
      ? productsWithDistance.filter(product => product.distanceKm === null || product.distanceKm <= radius)
      : productsWithDistance

    return successResponse(res, { products: nearbyProducts.length >= 3 ? nearbyProducts : productsWithDistance }, 200, undefined)
  } catch (error) {
    console.error('Products list error:', error)
    return errorResponse(res, 'Failed to fetch products', 500)
  }
})

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            location: true,
          },
        },
        shop: true,
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!product) {
      return errorResponse(res, 'Product not found', 404)
    }

    if (product.status !== 'ACTIVE' || product.stock <= 0 || product.shop?.status !== 'ACTIVE') {
      return errorResponse(res, 'Product not found', 404)
    }

    return successResponse(res, product)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch product', 500)
  }
})

router.post(
  '/',
  authMiddleware,
  requireRole(['SELLER']),
  validateBody(createProductSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        name,
        description,
        shortDescription,
        sku,
        slug,
        brand,
        price,
        originalPrice,
        discount,
        stock,
        categoryId,
        shopId,
        shopCategoryId,
        location,
        area,
        campus,
        condition,
        draft,
        publishedAt,
        images,
        isTrending,
        isNew,
        isDeal,
      } = req.body

      const userId = (req.user as any)?.userId || req.user?.id

      const shop = await prisma.shop.findFirst({ where: { ownerId: userId } })

      if (!shop) {
        return errorResponse(res, 'Shop not found', 404)
      }

      if (shopId !== shop.id) return errorResponse(res, 'Invalid shop for authenticated seller', 403)

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        return errorResponse(res, 'Category not found', 404)
      }

      if (shopCategoryId) {
        const shopCategory = await prisma.shopCategory.findFirst({ where: { id: shopCategoryId, shopId: shop.id } })
        if (!shopCategory) return errorResponse(res, 'Shop category does not belong to your shop', 400)
      }

      if (sku) {
        const existingSku = await prisma.product.findFirst({
          where: { sku, sellerId: userId },
        })
        if (existingSku) {
          return errorResponse(res, 'A product with this SKU already exists for your account', 409)
        }
      }

      const finalSlug = slug || generateSlug(name)
      const slugExists = await prisma.product.findFirst({ where: { slug: finalSlug } })
      if (slugExists) {
        return errorResponse(res, 'A product with this slug already exists', 409)
      }

      const finalSku = sku || generateSku(userId)

      const product = await prisma.product.create({
        data: {
          name,
          description,
          shortDescription,
          sku: finalSku,
          slug: finalSlug,
          brand,
          price,
          originalPrice,
          discount,
          stock,
          condition,
          location,
          area,
          campus,
          isTrending: isTrending ?? false,
          isNew: isNew ?? false,
          isDeal: isDeal ?? false,
          draft: draft ?? false,
          publishedAt: publishedAt ? new Date(publishedAt) : null,
          shopId,
          sellerId: userId,
          categoryId,
          shopCategoryId: shopCategoryId || null,
          images: {
            create: images.map((url: string, index: number) => ({
              url,
              sortOrder: index,
            })),
          },
        },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
            },
          },
          shop: true,
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      return successResponse(res, product, 201, 'Product created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create product', 500)
    }
  }
)

router.patch(
  '/:id',
  authMiddleware,
  requireRole(['SELLER']),
  validateBody(updateProductSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const userId = (req.user as any)?.userId || req.user?.id

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      })

      if (!existingProduct) {
        return errorResponse(res, 'Product not found', 404)
      }

      if (existingProduct.sellerId !== userId) {
        return errorResponse(res, 'You do not own this product', 403)
      }

      const { images, ...updateData } = req.body

      if (updateData.shopCategoryId) {
        const shopCategory = await prisma.shopCategory.findFirst({ where: { id: updateData.shopCategoryId, shopId: existingProduct.shopId } })
        if (!shopCategory) return errorResponse(res, 'Shop category does not belong to your shop', 400)
      }

      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({ where: { id: updateData.categoryId } })
        if (!category) return errorResponse(res, 'Category not found', 404)
      }

      if (updateData.sku) {
        const skuExists = await prisma.product.findFirst({
          where: { sku: updateData.sku, sellerId: userId, id: { not: id } },
        })
        if (skuExists) {
          return errorResponse(res, 'A product with this SKU already exists for your account', 409)
        }
      }

      if (updateData.slug) {
        const slugExists = await prisma.product.findFirst({
          where: { slug: updateData.slug, id: { not: id } },
        })
        if (slugExists) {
          return errorResponse(res, 'A product with this slug already exists', 409)
        }
      }

      const product = await prisma.$transaction(async (transaction) => {
        if (images) {
          await transaction.productImage.deleteMany({ where: { productId: id } })
        }
        return transaction.product.update({
        where: { id },
        data: {
          ...updateData,
          ...(updateData.publishedAt ? { publishedAt: new Date(updateData.publishedAt) } : {}),
          ...(images ? { images: { create: images.map((url: string, index: number) => ({ url, sortOrder: index })) } } : {}),
        },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
            },
          },
          shop: true,
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        })
      })

      return successResponse(res, product)
    } catch (error) {
      return errorResponse(res, 'Failed to update product', 500)
    }
  }
)

router.delete(
  '/:id',
  authMiddleware,
  requireRole(['SELLER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const userId = (req.user as any)?.userId || req.user?.id

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      })

      if (!existingProduct) {
        return errorResponse(res, 'Product not found', 404)
      }

      if (existingProduct.sellerId !== userId) {
        return errorResponse(res, 'You do not own this product', 403)
      }

      const orderCount = await prisma.orderItem.count({ where: { productId: id } })
      await prisma.product.update({
        where: { id },
        data: { status: orderCount > 0 ? 'ARCHIVED' : 'DELETED' },
      })

      return successResponse(res, null, 200, 'Product deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete product', 500)
    }
  }
)

router.get('/sku/generate', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = (req.user as any)?.userId || req.user?.id
    const sku = generateSku(userId)
    return successResponse(res, { sku })
  } catch (error) {
    return errorResponse(res, 'Failed to generate SKU', 500)
  }
})

export default router
