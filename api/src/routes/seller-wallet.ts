import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const summarySchema = z.object({})

router.get('/summary', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const sellerId = req.user!.id

  const earnings = await prisma.sellerEarnings.aggregate({
    where: { sellerId },
    _sum: { grossAmount: true, platformFee: true, deliveryFee: true, netAmount: true, promoDiscount: true },
    _count: { id: true },
  })
  const collaborationAllocations = await prisma.collaborationAllocation.findMany({ where: { sellerId }, select: { grossAmount: true, platformFee: true, netAmount: true, remainingNetAmount: true, status: true } })

  const available = await prisma.sellerEarnings.aggregate({
    where: { sellerId, status: 'AVAILABLE' },
    _sum: { netAmount: true },
  })

  const withdrawn = await prisma.sellerEarnings.aggregate({
    where: { sellerId, status: 'WITHDRAWN' },
    _sum: { netAmount: true },
  })

  const pendingPayout = await prisma.payout.findFirst({
    where: { userId: sellerId, status: 'PENDING' },
    select: { amount: true },
  })

  const products = await prisma.product.count({ where: { sellerId } })
  const orders = await prisma.order.count({ where: { sellerId } })
  const customers = await prisma.order.findMany({ where: { sellerId }, select: { customerId: true } }).then(orders => new Set(orders.map(o => o.customerId).filter(Boolean)).size)
  const views = await prisma.productView.count({ where: { product: { sellerId } } })

  return successResponse(res, {
    gross: Number(earnings._sum.grossAmount || 0) + collaborationAllocations.reduce((sum, item) => sum + Number(item.grossAmount), 0),
    commission: Number(earnings._sum.platformFee || 0) + collaborationAllocations.reduce((sum, item) => sum + Number(item.platformFee), 0),
    deliveryFee: earnings._sum.deliveryFee || 0,
    net: Number(earnings._sum.netAmount || 0) + collaborationAllocations.reduce((sum, item) => sum + Number(item.netAmount), 0),
    promoDiscount: earnings._sum.promoDiscount || 0,
    orderCount: earnings._count.id || 0,
    availableBalance: Number(available._sum.netAmount || 0) + collaborationAllocations.filter(item => ['AVAILABLE', 'PARTIALLY_REFUNDED'].includes(item.status)).reduce((sum, item) => sum + Number(item.remainingNetAmount), 0),
    withdrawnAmount: withdrawn._sum.netAmount || 0,
    pendingPayout: pendingPayout?.amount || 0,
    products,
    orders,
    customers,
    views,
  })
})

router.get('/transactions', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const type = req.query.type as string | undefined

  const where: any = { sellerId: req.user!.id }
  if (type) where.status = type

  const [transactions, total] = await Promise.all([
    prisma.sellerEarnings.findMany({
      where,
      include: { order: { select: { orderNumber: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerEarnings.count({ where }),
  ])

  return successResponse(res, {
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export default router
