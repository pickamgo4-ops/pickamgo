import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody, validateQuery } from '../types/express'
import { publicServiceVisibility } from '../utils/visibility'

const router = Router()

const listServicesQuerySchema = z.object({
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
})

const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be positive'),
  originalPrice: z.number().positive().optional(),
  duration: z.string().min(1, 'Duration is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  shopId: z.string().min(1, 'Shop ID is required'),
  shopCategoryId: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  area: z.string().optional(),
  campus: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  isTrending: z.boolean().optional(),
  isVerified: z.boolean().optional(),
})

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  duration: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  shopId: z.string().min(1).optional(),
  shopCategoryId: z.string().optional(),
  location: z.string().min(1).optional(),
  area: z.string().optional(),
  campus: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  isTrending: z.boolean().optional(),
  isVerified: z.boolean().optional(),
})

router.get('/', validateQuery(listServicesQuerySchema), async (req: AuthenticatedRequest, res) => {
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
    } = req.query as z.infer<typeof listServicesQuerySchema>

    const where: any = { ...publicServiceVisibility }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
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
      where.location = { contains: location }
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

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
            },
          },
          shop: { include: { customization: true } },
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.service.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return successResponse(res, { services }, 200, undefined)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch services', 500)
  }
})

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            location: true,
          },
        },
        shop: { include: { customization: true } },
          category: { select: { id: true, name: true, emoji: true, color: true } },
          images: {
          orderBy: { sortOrder: 'asc' },
        },
        availability: true,
      },
    })

    if (!service) {
      return errorResponse(res, 'Service not found', 404)
    }

    return successResponse(res, service)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch service', 500)
  }
})

router.post(
  '/',
  authMiddleware,
  requireRole(['SELLER']),
  validateBody(createServiceSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        name,
        description,
        price,
        originalPrice,
        duration,
        categoryId,
        shopId,
        shopCategoryId,
        location,
        area,
        campus,
        images,
        isTrending,
        isVerified,
      } = req.body

      const userId = (req.user as any)?.userId || req.user?.id

      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
      })

      if (!shop) {
        return errorResponse(res, 'Shop not found', 404)
      }

      if (shop.ownerId !== userId) {
        return errorResponse(res, 'You do not own this shop', 403)
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        return errorResponse(res, 'Category not found', 404)
      }

      const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

      const availabilityData = []
      const today = new Date()
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        availabilityData.push({
          date: dateStr,
          timeSlots: JSON.stringify(timeSlots),
          isAvailable: true,
        })
      }

      const service = await prisma.service.create({
        data: {
          name,
          description,
          price,
          originalPrice,
          duration,
          location,
          area,
          campus,
          isTrending: isTrending ?? false,
          isVerified: isVerified ?? false,
          shopId,
          providerId: userId,
          categoryId,
          shopCategoryId: shopCategoryId || null,
          images: {
            create: images.map((url: string, index: number) => ({
              url,
              sortOrder: index,
            })),
          },
          availability: {
            create: availabilityData,
          },
        },
        include: {
          provider: {
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
          availability: true,
        },
      })

      return successResponse(res, service, 201, 'Service created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create service', 500)
    }
  }
)

router.patch(
  '/:id',
  authMiddleware,
  requireRole(['SELLER']),
  validateBody(updateServiceSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const userId = (req.user as any)?.userId || req.user?.id

      const existingService = await prisma.service.findUnique({
        where: { id },
      })

      if (!existingService) {
        return errorResponse(res, 'Service not found', 404)
      }

      if (existingService.providerId !== userId) {
        return errorResponse(res, 'You do not own this service', 403)
      }

      const { images, ...updateData } = req.body

      const service = await prisma.service.update({
        where: { id },
        data: updateData,
        include: {
          provider: {
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
          availability: true,
        },
      })

      return successResponse(res, service)
    } catch (error) {
      return errorResponse(res, 'Failed to update service', 500)
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

      const existingService = await prisma.service.findUnique({
        where: { id },
      })

      if (!existingService) {
        return errorResponse(res, 'Service not found', 404)
      }

      if (existingService.providerId !== userId) {
        return errorResponse(res, 'You do not own this service', 403)
      }

      await prisma.service.update({
        where: { id },
        data: { status: 'DELETED' },
      })

      return successResponse(res, null, 200, 'Service deleted successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to delete service', 500)
    }
  }
)

export default router
