import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest, successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/order/:orderId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
  if (!order) return errorResponse(res, 'Order not found', 404)

  const isCustomer = order.customerId === req.user!.id
  const isSeller = order.sellerId === req.user!.id
  const isRider = order.riderId === req.user!.id
  const isAdmin = req.user!.isAdmin
  if (!isCustomer && !isSeller && !isRider && !isAdmin) return errorResponse(res, 'Not authorized', 403)

  const history = await prisma.orderStatusHistory.findMany({
    where: { orderId: req.params.orderId },
    orderBy: { createdAt: 'desc' },
  })

  return successResponse(res, history)
})

export default router
