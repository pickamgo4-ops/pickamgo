import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const disputeSchema = z.object({
  orderId: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
})

router.post('/', authMiddleware, validateBody(disputeSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, type, description } = req.body

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return errorResponse(res, 'Order not found', 404)

    const isCustomer = !!order.customerId && req.user!.id === order.customerId
    const isSeller = !!order.sellerId && req.user!.id === order.sellerId

    if (!isCustomer && !isSeller) {
      return errorResponse(res, 'Not authorized to create dispute for this order', 403)
    }

    if (!order.customerId || !order.sellerId) {
      return errorResponse(res, 'Cannot create dispute for guest order', 400)
    }

    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        customerId: order.customerId,
        sellerId: order.sellerId,
        type,
        description,
      },
    })

    await prisma.notification.create({
      data: {
        userId: isCustomer ? order.sellerId : order.customerId,
        type: 'DISPUTE_OPENED',
        title: 'Dispute Opened',
        message: `A dispute was opened for order ${order.orderNumber}`,
        data: JSON.stringify({ disputeId: dispute.id, orderId }),
      },
    })

    return successResponse(res, dispute, 201, 'Dispute created successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to create dispute', 500)
  }
})

router.get('/order/:orderId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return errorResponse(res, 'Order not found', 404)

    const isCustomer = req.user!.id === order.customerId
    const isSeller = req.user!.id === order.sellerId
    const isAdmin = req.user!.isAdmin

    if (!isCustomer && !isSeller && !isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const disputes = await prisma.dispute.findMany({
      where: { orderId },
      include: {
        customer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(res, disputes)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch disputes', 500)
  }
})

router.patch('/:id/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const { id } = req.params
    const { status } = req.body

    if (!['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400)
    }

    const dispute = await prisma.dispute.findUnique({ where: { id } })
    if (!dispute) return errorResponse(res, 'Dispute not found', 404)

    const updated = await prisma.dispute.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    })

    return successResponse(res, updated, undefined, 'Dispute status updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update dispute status', 500)
  }
})

export default router
