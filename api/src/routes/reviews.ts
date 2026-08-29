import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const normalizeReviewPayload = (review: any) => ({
  ...review,
  userName: review.user?.name || review.userName || 'Anonymous',
  userAvatar: review.user?.avatar || review.userAvatar || '',
  createdAt: review.createdAt?.toISOString ? review.createdAt.toISOString() : review.createdAt,
})

router.get('/product/:targetId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetType: 'PRODUCT', targetId: req.params.targetId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const normalizedReviews = reviews.map(normalizeReviewPayload)
  const avgRating = normalizedReviews.length > 0 ? normalizedReviews.reduce((sum, r) => sum + r.rating, 0) / normalizedReviews.length : 0

  return successResponse(res, { reviews: normalizedReviews, averageRating: avgRating, totalReviews: normalizedReviews.length })
})

router.get('/service/:targetId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetType: 'SERVICE', targetId: req.params.targetId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const normalizedReviews = reviews.map(normalizeReviewPayload)
  const avgRating = normalizedReviews.length > 0 ? normalizedReviews.reduce((sum, r) => sum + r.rating, 0) / normalizedReviews.length : 0

  return successResponse(res, { reviews: normalizedReviews, averageRating: avgRating, totalReviews: normalizedReviews.length })
})

router.get('/shop/:targetId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetType: 'SHOP', targetId: req.params.targetId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const normalizedReviews = reviews.map(normalizeReviewPayload)
  const avgRating = normalizedReviews.length > 0 ? normalizedReviews.reduce((sum, r) => sum + r.rating, 0) / normalizedReviews.length : 0

  return successResponse(res, { reviews: normalizedReviews, averageRating: avgRating, totalReviews: normalizedReviews.length })
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

    const hasPurchasedFromShop = await prisma.order.findFirst({
      where: {
        customerId: req.user!.id,
        shopId: targetId,
        status: { notIn: ['CANCELLED', 'CANCELLED_BY_CUSTOMER', 'FAILED', 'REFUNDED'] },
      },
      select: { id: true },
    })

    if (!hasPurchasedFromShop) {
      return errorResponse(res, 'Only customers who purchased from this shop can leave a review.', 403)
    }
  }

  const existingReview = await prisma.review.findFirst({
    where: { userId: req.user!.id, targetType, targetId },
  })

  if (existingReview) {
    return errorResponse(res, 'You have already reviewed this item.', 409)
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
    include: { user: { select: { id: true, name: true, avatar: true } } },
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

  return successResponse(res, normalizeReviewPayload(review), 201, 'Review created successfully')
})

router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) return errorResponse(res, 'Review not found', 404)
  if (review.userId !== req.user!.id && !req.user!.isAdmin) return errorResponse(res, 'Not authorized to edit this review', 403)

  const update = z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().min(10).optional(),
  }).parse(req.body)

  const updated = await prisma.review.update({
    where: { id: req.params.id },
    data: update,
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })

  if (updated.targetType === 'PRODUCT') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'PRODUCT', targetId: updated.targetId } })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await prisma.product.update({ where: { id: updated.targetId }, data: { rating: avg, reviewsCount: reviews.length } })
  } else if (updated.targetType === 'SERVICE') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'SERVICE', targetId: updated.targetId } })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await prisma.service.update({ where: { id: updated.targetId }, data: { rating: avg, reviewsCount: reviews.length } })
  } else if (updated.targetType === 'SHOP') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'SHOP', targetId: updated.targetId } })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await prisma.shop.update({ where: { id: updated.targetId }, data: { rating: avg, reviewsCount: reviews.length } })
  }

  return successResponse(res, normalizeReviewPayload(updated), 200, 'Review updated successfully')
})

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) return errorResponse(res, 'Review not found', 404)
  if (review.userId !== req.user!.id && !req.user!.isAdmin) return errorResponse(res, 'Not authorized to delete this review', 403)

  const deleted = await prisma.review.delete({ where: { id: req.params.id } })

  if (deleted.targetType === 'PRODUCT') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'PRODUCT', targetId: deleted.targetId } })
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
    await prisma.product.update({ where: { id: deleted.targetId }, data: { rating: avg, reviewsCount: reviews.length } })
  } else if (deleted.targetType === 'SERVICE') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'SERVICE', targetId: deleted.targetId } })
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
    await prisma.service.update({ where: { id: deleted.targetId }, data: { rating: avg, reviewsCount: reviews.length } })
  } else if (deleted.targetType === 'SHOP') {
    const reviews = await prisma.review.findMany({ where: { targetType: 'SHOP', targetId: deleted.targetId } })
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
    await prisma.shop.update({ where: { id: deleted.targetId }, data: { rating: avg, reviewsCount: reviews.length } })
  }

  return successResponse(res, { deleted: true }, 200, 'Review deleted successfully')
})

export default router
