import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

router.get('/product/:targetId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetType: 'PRODUCT', targetId: req.params.targetId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return successResponse(res, { reviews, averageRating: avgRating })
})

router.get('/service/:targetId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetType: 'SERVICE', targetId: req.params.targetId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return successResponse(res, { reviews, averageRating: avgRating })
})

router.get('/shop/:targetId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetType: 'SHOP', targetId: req.params.targetId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return successResponse(res, { reviews, averageRating: avgRating })
})

const createReviewSchema = z.object({
  targetType: z.enum(['PRODUCT', 'SERVICE', 'SHOP']),
  targetId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10),
})

router.post('/', authMiddleware, validateBody(createReviewSchema), async (req: AuthenticatedRequest, res) => {
  const { targetType, targetId, rating, comment } = req.body

  if (targetType === 'PRODUCT') {
    const product = await prisma.product.findUnique({ where: { id: targetId } })
    if (!product) return errorResponse(res, 'Product not found', 404)
  } else if (targetType === 'SERVICE') {
    const service = await prisma.service.findUnique({ where: { id: targetId } })
    if (!service) return errorResponse(res, 'Service not found', 404)
  } else if (targetType === 'SHOP') {
    const shop = await prisma.shop.findUnique({ where: { id: targetId } })
    if (!shop) return errorResponse(res, 'Shop not found', 404)
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { name: true, avatar: true },
  })

  const review = await prisma.review.create({
    data: {
      userId: req.user!.id,
      userName: user?.name || 'Anonymous',
      userAvatar: user?.avatar || '',
      targetType,
      targetId,
      rating,
      comment,
    },
  })

  if (targetType === 'PRODUCT') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'PRODUCT', targetId } })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await prisma.product.update({
      where: { id: targetId },
      data: { rating: avg, reviewsCount: reviews.length },
    })
  } else if (targetType === 'SERVICE') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'SERVICE', targetId } })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await prisma.service.update({
      where: { id: targetId },
      data: { rating: avg, reviewsCount: reviews.length },
    })
  } else if (targetType === 'SHOP') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'SHOP', targetId } })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await prisma.shop.update({
      where: { id: targetId },
      data: { rating: avg, reviewsCount: reviews.length },
    })
  }

  return successResponse(res, review, 201, 'Review created successfully')
})

export default router
