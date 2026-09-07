import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const cancellationSchema = z.object({
  reason: z.string().min(1).max(100),
  explanation: z.string().max(1000).optional(),
})

router.post('/', authMiddleware, validateBody(cancellationSchema), async (req: AuthenticatedRequest, res) => {
  const { orderId, reason, explanation } = req.body

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return errorResponse(res, 'Order not found', 404)

  const isCustomer = order.customerId === req.user!.id
  if (!isCustomer) return errorResponse(res, 'Only the customer can request cancellation', 403)

  if (!['PENDING_PAYMENT', 'PAID', 'CONFIRMED'].includes(order.status)) {
    return errorResponse(res, 'This order cannot be cancelled at its current status', 400)
  }

  const existingRefund = await prisma.refund.findFirst({ where: { orderId, status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] } } })
  if (existingRefund) return errorResponse(res, 'A refund or cancellation request already exists for this order', 409)

  const refund = await prisma.refund.create({
    data: {
      orderId,
      sellerId: order.sellerId,
      customerId: req.user!.id,
      amount: order.total,
      currency: 'GHS',
      reason: `${reason}${explanation ? `: ${explanation}` : ''}`,
      status: 'PENDING',
    },
    include: { order: { select: { orderNumber: true, status: true } } },
  })

  await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLATION_REQUESTED' } })

  await prisma.orderStatusHistory.create({
    data: { orderId, status: 'CANCELLATION_REQUESTED', notes: `Customer requested cancellation: ${reason}`, createdBy: req.user!.id },
  })

  await prisma.notification.create({
    data: {
      userId: order.sellerId,
      type: 'ORDER_CANCELLATION_REQUEST',
      title: 'Cancellation Request',
      message: `Customer requested to cancel order ${order.orderNumber}`,
      data: JSON.stringify({ orderId, refundId: refund.id }),
    },
  })

  return successResponse(res, refund, 201, 'Cancellation request submitted')
})

router.get('/order/:orderId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
  if (!order) return errorResponse(res, 'Order not found', 404)

  const isCustomer = order.customerId === req.user!.id
  const isSeller = order.sellerId === req.user!.id
  const isAdmin = req.user!.isAdmin
  if (!isCustomer && !isSeller && !isAdmin) return errorResponse(res, 'Not authorized', 403)

  const requests = await prisma.refund.findMany({
    where: { orderId: req.params.orderId },
    include: { customer: { select: { id: true, name: true, avatar: true } }, seller: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return successResponse(res, requests)
})

export default router
