import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { assertModerationSafe } from '../utils/moderation'

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

  try {
    assertModerationSafe(comment, 'review comment')
  } catch (error: any) {
    return errorResponse(res, 'For your safety, PickAmGo does not allow users to exchange personal contact or payment information for transactions outside the platform. [Edit Message]', 400)
  }

  if (targetType === 'PRODUCT') {
    const product = await prisma.product.findUnique({ where: { id: targetId } })
    if (!product) return errorResponse(res, 'Product not found', 404)
    const ownsProduct = product.sellerId === req.user!.id
    const verifiedPurchase = await prisma.orderItem.findFirst({
      where: {
        productId: targetId,
        order: { customerId: req.user!.id, status: 'DELIVERED' },
      },
      select: { id: true },
    })
    if (!verifiedPurchase && !req.user!.isAdmin) {
      return errorResponse(res, 'Only customers who received this product can leave a review.', 403)
    }
    if (ownsProduct) return errorResponse(res, 'Sellers cannot review their own products.', 403)
  } else if (targetType === 'SERVICE') {
    const service = await prisma.service.findUnique({ where: { id: targetId } })
    if (!service) return errorResponse(res, 'Service not found', 404)
    const ownsService = service.providerId === req.user!.id
    const verifiedPurchase = await prisma.orderItem.findFirst({
      where: { serviceId: targetId, order: { customerId: req.user!.id, status: 'DELIVERED' } },
      select: { id: true },
    })
    if (!verifiedPurchase && !req.user!.isAdmin) {
      return errorResponse(res, 'Only customers who completed this service can leave a review.', 403)
    }
    if (ownsService) return errorResponse(res, 'Providers cannot review their own services.', 403)
  } else if (targetType === 'SHOP') {
    const shop = await prisma.shop.findUnique({ where: { id: targetId } })
    if (!shop) return errorResponse(res, 'Shop not found', 404)

    const ownsShop = shop.ownerId === req.user!.id

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

    if (ownsShop) return errorResponse(res, 'Sellers cannot review their own shop.', 403)
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

router.get('/:id/responses', async (req, res) => {
  const responses = await prisma.reviewResponse.findMany({
    where: { reviewId: req.params.id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return successResponse(res, responses)
})

const responseSchema = z.object({ comment: z.string().min(2).max(1000) })

router.post('/:id/responses', authMiddleware, validateBody(responseSchema), async (req: AuthenticatedRequest, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) return errorResponse(res, 'Review not found', 404)

  const isShopOwner = review.targetType === 'SHOP'
    ? (await prisma.shop.findUnique({ where: { id: review.targetId }, select: { ownerId: true } }))?.ownerId === req.user!.id
    : false
  const isProductSeller = review.targetType === 'PRODUCT'
    ? (await prisma.product.findUnique({ where: { id: review.targetId }, select: { sellerId: true } }))?.sellerId === req.user!.id
    : false
  const isServiceProvider = review.targetType === 'SERVICE'
    ? (await prisma.service.findUnique({ where: { id: review.targetId }, select: { providerId: true } }))?.providerId === req.user!.id
    : false

  if (!isShopOwner && !isProductSeller && !isServiceProvider && !req.user!.isAdmin) {
    return errorResponse(res, 'Only the shop owner, seller, provider, or admin can reply to this review.', 403)
  }

  const response = await prisma.reviewResponse.create({
    data: {
      reviewId: req.params.id,
      userId: req.user!.id,
      userName: req.user!.name,
      comment: req.body.comment,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })

  return successResponse(res, response, 201, 'Reply added')
})

router.post('/:id/images', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) return errorResponse(res, 'Review not found', 404)
  if (review.userId !== req.user!.id) return errorResponse(res, 'Not authorized', 403)

  const { urls } = req.body as { urls?: string[] }
  const imageUrls = Array.isArray(urls) ? urls : [urls].filter(Boolean)

  const images = await prisma.$transaction(
    imageUrls.map((url, index) =>
      prisma.reviewImage.create({
        data: { reviewId: req.params.id, url, sortOrder: index },
      })
    )
  )

  return successResponse(res, images, 201, 'Images uploaded')
})

export default router
