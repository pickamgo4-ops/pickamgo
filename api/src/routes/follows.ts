import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse } from '../types/express'

const router = Router()

router.post('/shops/:shopId/follow', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { shopId } = req.params
    const userId = req.user!.id

    const shop = await prisma.shop.findUnique({ where: { id: shopId } })
    if (!shop) return errorResponse(res, 'Shop not found', 404)

    const existing = await prisma.shopFollow.findUnique({
      where: { userId_shopId: { userId, shopId } },
    })

    if (existing) {
      await prisma.shopFollow.delete({ where: { id: existing.id } })
      await prisma.shop.update({
        where: { id: shopId },
        data: { followersCount: { decrement: 1 } },
      })
      return successResponse(res, { following: false }, 200, 'Unfollowed shop')
    }

    await prisma.shopFollow.create({
      data: { userId, shopId },
    })

    await prisma.shop.update({
      where: { id: shopId },
      data: { followersCount: { increment: 1 } },
    })

    await prisma.notification.create({
      data: {
        userId: shop.ownerId,
        type: 'NEW_FOLLOWER',
        title: 'New Follower',
        message: `${req.user!.name} started following your shop`,
        data: JSON.stringify({ shopId, userId }),
      },
    })

    return successResponse(res, { following: true }, 201, 'Followed shop')
  } catch (error) {
    return errorResponse(res, 'Failed to follow shop', 500)
  }
})

router.get('/shops/:shopId/follow-status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { shopId } = req.params
    const userId = req.user!.id

    const follow = await prisma.shopFollow.findUnique({
      where: { userId_shopId: { userId, shopId } },
    })

    const count = await prisma.shopFollow.count({ where: { shopId } })

    return successResponse(res, { following: !!follow, count })
  } catch (error) {
    return errorResponse(res, 'Failed to check follow status', 500)
  }
})

router.get('/user/following', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id

    const follows = await prisma.shopFollow.findMany({
      where: { userId },
      include: {
        shop: {
          include: {
            owner: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(res, follows.map(f => f.shop))
  } catch (error) {
    return errorResponse(res, 'Failed to fetch followed shops', 500)
  }
})

export default router
