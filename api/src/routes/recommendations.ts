import { Router } from 'express'
import prisma from '../utils/prisma'
import { successResponse, errorResponse } from '../types/express'
import { AuthenticatedRequest } from '../middleware/auth'
import { publicProductVisibility } from '../utils/visibility'

const router = Router()

const includeRelations = {
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
  category: true,
  images: {
    orderBy: { sortOrder: 'asc' as const },
  },
}

router.get('/:productId/recommendations', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        shop: true,
      },
    })

    if (!currentProduct) {
      return errorResponse(res, 'Product not found', 404)
    }
    if (currentProduct.status !== 'ACTIVE' || currentProduct.stock <= 0 || currentProduct.shop?.status !== 'ACTIVE') {
      return errorResponse(res, 'Product not found', 404)
    }

    const recommendations: any[] = []
    const seenIds = new Set<string>([productId])

    const addUniqueProducts = (products: any[], limit: number) => {
      for (const product of products) {
        if (recommendations.length >= limit) break
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id)
          recommendations.push(product)
        }
      }
    }

    const sameCategoryProducts = await prisma.product.findMany({
      where: {
        ...publicProductVisibility,
        categoryId: currentProduct.categoryId,
        id: { not: productId },
      },
      orderBy: [{ isTrending: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: includeRelations,
    })
    addUniqueProducts(sameCategoryProducts, 8)

    if (recommendations.length < 8 && currentProduct.shopId) {
      const sameShopProducts = await prisma.product.findMany({
        where: {
          ...publicProductVisibility,
          shopId: currentProduct.shopId,
          id: { not: productId },
        },
        orderBy: [{ isTrending: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: includeRelations,
      })
      addUniqueProducts(sameShopProducts, 8)
    }

    if (recommendations.length < 8) {
      const relatedCategoryIds = await prisma.product.findMany({
        where: {
          categoryId: currentProduct.categoryId,
          status: 'ACTIVE',
        },
        select: { categoryId: true },
        distinct: ['categoryId'],
      })

      const otherCategories = await prisma.category.findMany({
        where: {
          isActive: true,
          id: { not: currentProduct.categoryId },
        },
        take: 5,
      })

      if (otherCategories.length > 0) {
        const relatedProducts = await prisma.product.findMany({
          where: {
            ...publicProductVisibility,
            categoryId: { in: otherCategories.map(c => c.id) },
            id: { not: productId },
          },
          orderBy: [{ isTrending: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
          take: 8,
          include: includeRelations,
        })
        addUniqueProducts(relatedProducts, 8)
      }
    }

    if (recommendations.length < 8) {
      const popularProducts = await prisma.product.findMany({
        where: {
          ...publicProductVisibility,
          id: { not: productId },
        },
        orderBy: [{ isTrending: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: includeRelations,
      })
      addUniqueProducts(popularProducts, 8)
    }

    return successResponse(res, recommendations.slice(0, 8))
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return errorResponse(res, 'Failed to fetch recommendations', 500)
  }
})

export default router
