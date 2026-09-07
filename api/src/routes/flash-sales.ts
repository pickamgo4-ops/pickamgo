import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const flashSaleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  maxQuantity: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  productIds: z.array(z.string()).min(1),
})

router.get('/', async (req, res) => {
  const now = new Date()
  const sales = await prisma.flashSale.findMany({
    where: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gte: now } },
    include: {
      products: {
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              shop: { select: { id: true, name: true, slug: true, logo: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return successResponse(res, sales)
})

router.post('/', authMiddleware, requireRole(['ADMIN', 'SELLER']), validateBody(flashSaleSchema), async (req: AuthenticatedRequest, res) => {
  const { name, description, discountType, discountValue, maxQuantity, startsAt, endsAt, productIds } = req.body

  const startDate = new Date(startsAt)
  const endDate = new Date(endsAt)
  if (endDate <= startDate) return errorResponse(res, 'End date must be after start date', 400)

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: 'ACTIVE' },
    include: { shop: { select: { ownerId: true } } },
  })

  if (products.length !== productIds.length) return errorResponse(res, 'One or more products not found or inactive', 404)

  if (req.user!.isSeller) {
    const notOwner = products.some(p => p.shop.ownerId !== req.user!.id)
    if (notOwner) return errorResponse(res, 'You can only create flash sales for your own products', 403)
  }

  const sale = await prisma.flashSale.create({
    data: {
      name,
      description,
      discountType,
      discountValue,
      maxQuantity,
      startsAt: startDate,
      endsAt: endDate,
      createdBy: req.user!.id,
      products: {
        create: products.map((p, idx) => ({ productId: p.id, sortOrder: idx })),
      },
    },
    include: { products: { include: { product: true } } },
  })

  return successResponse(res, sale, 201, 'Flash sale created')
})

router.patch('/:id/status', authMiddleware, requireRole(['ADMIN', 'SELLER']), async (req: AuthenticatedRequest, res) => {
  const { status } = req.body as { status: string }
  if (!['ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'].includes(status)) return errorResponse(res, 'Invalid status', 400)

  const sale = await prisma.flashSale.findUnique({ where: { id: req.params.id } })
  if (!sale) return errorResponse(res, 'Flash sale not found', 404)

  if (req.user!.isSeller && sale.createdBy !== req.user!.id) return errorResponse(res, 'Not authorized', 403)

  const updated = await prisma.flashSale.update({ where: { id: req.params.id }, data: { status } })
  return successResponse(res, updated, undefined, `Flash sale ${status.toLowerCase()}`)
})

router.delete('/:id', authMiddleware, requireRole(['ADMIN', 'SELLER']), async (req: AuthenticatedRequest, res) => {
  const sale = await prisma.flashSale.findUnique({ where: { id: req.params.id } })
  if (!sale) return errorResponse(res, 'Flash sale not found', 404)
  if (req.user!.isSeller && sale.createdBy !== req.user!.id) return errorResponse(res, 'Not authorized', 403)

  await prisma.flashSale.delete({ where: { id: req.params.id } })
  return successResponse(res, null, undefined, 'Flash sale deleted')
})

export default router
