import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const type = req.query.type as string | undefined

  const where: any = { userId: req.user!.id }
  if (type) where.targetType = type.toUpperCase()

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.favorite.count({ where }),
  ])

  const enrichedFavorites = await Promise.all(
    favorites.map(async (fav) => {
      if (fav.targetType === 'PRODUCT') {
        const product = await prisma.product.findUnique({
          where: { id: fav.targetId },
          include: {
            seller: { select: { id: true, name: true, avatar: true } },
            category: { select: { id: true, name: true, emoji: true, color: true } },
            images: { take: 1 },
          },
        })
        return { ...fav, product }
      } else if (fav.targetType === 'SERVICE') {
        const service = await prisma.service.findUnique({
          where: { id: fav.targetId },
          include: {
            provider: { select: { id: true, name: true, avatar: true } },
            category: { select: { id: true, name: true, emoji: true, color: true } },
            images: { take: 1 },
          },
        })
        return { ...fav, service }
      }
      return fav
    })
  )

  return successResponse(res, {
    favorites: enrichedFavorites,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

const favoriteSchema = z.object({
  targetType: z.enum(['PRODUCT', 'SERVICE', 'SHOP']),
  targetId: z.string(),
})

router.post('/', authMiddleware, validateBody(favoriteSchema), async (req: AuthenticatedRequest, res) => {
  const { targetType, targetId } = req.body

  if (targetType === 'PRODUCT') {
    const product = await prisma.product.findUnique({ where: { id: targetId } })
    if (!product) return errorResponse(res, 'Product not found', 404)
  } else if (targetType === 'SERVICE') {
    const service = await prisma.service.findUnique({ where: { id: targetId } })
    if (!service) return errorResponse(res, 'Service not found', 404)
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_targetType_targetId: {
        userId: req.user!.id,
        targetType,
        targetId,
      },
    },
    update: {},
    create: {
      userId: req.user!.id,
      targetType,
      targetId,
    },
  })

  return successResponse(res, favorite, 201, 'Added to favorites')
})

router.delete('/:targetType/:targetId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { targetType, targetId } = req.params

  await prisma.favorite.deleteMany({
    where: {
      userId: req.user!.id,
      targetType: targetType.toUpperCase(),
      targetId,
    },
  })

  return successResponse(res, null, undefined, 'Removed from favorites')
})

export default router
