import { Router } from 'express'
import prisma from '../utils/prisma'
import { successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/', async (req, res) => {
  const { category, page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.max(1, parseInt(limit) || 20)

  const now = new Date()
  const where: any = {
    status: 'ACTIVE',
    startsAt: { lte: now },
    endsAt: { gte: now },
  }

  let flashSaleIds: string[] = []
  const flashSales = await prisma.flashSale.findMany({ where, select: { id: true } })
  if (flashSales.length > 0) {
    flashSaleIds = flashSales.map(s => s.id)
    where.products = { some: { flashSaleId: { in: flashSaleIds } } }
  }

  if (category) {
    where.category = { name: { equals: category, mode: 'insensitive' } }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        shop: { select: { id: true, name: true, slug: true, logo: true } },
        category: { select: { id: true, name: true, emoji: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.product.count({ where }),
  ])

  return successResponse(res, {
    products,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  })
})

export default router
