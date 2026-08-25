import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()
const imageUrl = z.string().refine(value => value.startsWith('/') || /^https?:\/\//.test(value), 'Invalid image URL')

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  image: imageUrl.optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
})

const updateCategorySchema = categorySchema.partial()

router.get('/shops/:shopId', async (req: AuthenticatedRequest, res) => {
  try {
    const { shopId } = req.params

    const categories = await prisma.shopCategory.findMany({
      where: { shopId, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return successResponse(res, categories)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch shop categories', 500)
  }
})

router.post('/shops/:shopId', authMiddleware, requireRole(['SELLER']), validateBody(categorySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { shopId } = req.params
    const userId = req.user!.id

    const shop = await prisma.shop.findUnique({ where: { id: shopId } })
    if (!shop) return errorResponse(res, 'Shop not found', 404)
    if (shop.ownerId !== userId) return errorResponse(res, 'Not authorized to manage this shop', 403)

    const { name, ...data } = req.body
    const normalizedName = name.trim().toLowerCase()

    const existing = await prisma.shopCategory.findFirst({
      where: {
        shopId,
        name: { equals: normalizedName },
      },
    })
    if (existing) {
      return errorResponse(res, 'A category with this name already exists in this shop', 409)
    }

    const category = await prisma.shopCategory.create({
      data: { ...data, shopId, name: name.trim() },
    })

    return successResponse(res, category, 201, 'Category created successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to create category', 500)
  }
})

router.patch('/:id', authMiddleware, requireRole(['SELLER']), validateBody(updateCategorySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { name, ...data } = req.body

    const existing = await prisma.shopCategory.findUnique({ where: { id } })
    if (!existing) return errorResponse(res, 'Category not found', 404)

    const shop = await prisma.shop.findUnique({ where: { id: existing.shopId } })
    if (!shop || shop.ownerId !== userId) return errorResponse(res, 'Not authorized', 403)

    if (name) {
      const duplicate = await prisma.shopCategory.findFirst({
        where: {
          shopId: existing.shopId,
          name: { equals: name.trim().toLowerCase() },
          id: { not: id },
        },
      })
      if (duplicate) {
        return errorResponse(res, 'A category with this name already exists', 409)
      }
    }

    const updated = await prisma.shopCategory.update({
      where: { id },
      data: { ...data, name: name?.trim() },
    })

    return successResponse(res, updated, undefined, 'Category updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update category', 500)
  }
})

router.delete('/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const category = await prisma.shopCategory.findUnique({ where: { id } })
    if (!category) return errorResponse(res, 'Category not found', 404)

    const shop = await prisma.shop.findUnique({ where: { id: category.shopId } })
    if (!shop || shop.ownerId !== userId) return errorResponse(res, 'Not authorized', 403)

    const productsInCategory = await prisma.product.count({
      where: { shopCategoryId: id, status: { not: 'DELETED' } },
    })
    const servicesInCategory = await prisma.service.count({
      where: { shopCategoryId: id, status: { not: 'DELETED' } },
    })

    if (productsInCategory > 0 || servicesInCategory > 0) {
      await prisma.shopCategory.update({
        where: { id },
        data: { isActive: false },
      })
      return successResponse(res, null, 200, 'Category hidden (contains active items)')
    }

    await prisma.shopCategory.delete({ where: { id } })

    return successResponse(res, null, 200, 'Category deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete category', 500)
  }
})

router.post('/reorder', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const { categories } = req.body
    const userId = req.user!.id

    if (!Array.isArray(categories)) {
      return errorResponse(res, 'Categories array required', 400)
    }

    for (const cat of categories) {
      const existing = await prisma.shopCategory.findUnique({ where: { id: cat.id } })
      if (!existing) continue

      const shop = await prisma.shop.findUnique({ where: { id: existing.shopId } })
      if (!shop || shop.ownerId !== userId) continue

      await prisma.shopCategory.update({
        where: { id: cat.id },
        data: { sortOrder: cat.sortOrder },
      })
    }

    return successResponse(res, null, 200, 'Categories reordered successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to reorder categories', 500)
  }
})

export default router
