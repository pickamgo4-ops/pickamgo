import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createAuditEntry } from '../utils/auditLog'

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

    let dispute
    try {
      dispute = await prisma.$transaction(async tx => {
        const activeDispute = await tx.dispute.findFirst({
          where: { orderId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
          select: { id: true },
        })
        if (activeDispute) throw new Error('ACTIVE_DISPUTE_EXISTS')

        return tx.dispute.create({
          data: { orderId, customerId: order.customerId, sellerId: order.sellerId, type, description },
        })
      }, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (error instanceof Error && error.message === 'ACTIVE_DISPUTE_EXISTS') {
        return errorResponse(res, 'This order already has an active dispute', 409)
      }
      throw error
    }

    const recentDisputes = await prisma.dispute.count({
      where: {
        customerId: req.user!.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    })
    if (recentDisputes >= 3) {
      await prisma.fraudAlert.create({
        data: {
          userId: req.user!.id,
          orderId,
          riskLevel: 'MEDIUM',
          reason: 'Repeated dispute creation in a short period',
          status: 'OPEN',
          metadata: JSON.stringify({ recentDisputes }),
        },
      })
    }

    await createAuditEntry({
      actorId: req.user!.id,
      actorRole: isCustomer ? 'CUSTOMER' : 'SELLER',
      action: 'DISPUTE_CREATED',
      targetType: 'DISPUTE',
      targetId: dispute.id,
      metadata: JSON.stringify({ orderId, type }),
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

    const allowedTransitions: Record<string, string[]> = {
      OPEN: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED'],
      UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
      RESOLVED: [],
      REJECTED: [],
      CANCELLED: [],
    }
    if (!(allowedTransitions[dispute.status] || []).includes(status)) {
      return errorResponse(res, `Cannot change dispute from ${dispute.status} to ${status}`, 409)
    }

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.dispute.updateMany({ where: { id, status: dispute.status }, data: { status, updatedAt: new Date() } })
      if (changed.count !== 1) throw new Error('DISPUTE_STATE_CHANGED')
      const next = await tx.dispute.findUnique({ where: { id } })
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorRole: 'ADMIN',
          action: 'DISPUTE_STATUS_CHANGED',
          targetType: 'DISPUTE',
          targetId: id,
          reason: status,
          metadata: JSON.stringify({ orderId: dispute.orderId, previousStatus: dispute.status }),
        },
      })
      return next!
    }).catch(error => {
      if (error instanceof Error && error.message === 'DISPUTE_STATE_CHANGED') return null
      throw error
    })

    if (!updated) return errorResponse(res, 'Dispute state changed; refresh before retrying', 409)

    return successResponse(res, updated, undefined, 'Dispute status updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update dispute status', 500)
  }
})

router.get('/:id/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } })
    if (!dispute) return errorResponse(res, 'Dispute not found', 404)

    const isCustomer = dispute.customerId === req.user!.id
    const isSeller = dispute.sellerId === req.user!.id
    const isAdmin = req.user!.isAdmin

    if (!isCustomer && !isSeller && !isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const messages = await prisma.disputeMessage.findMany({
      where: { disputeId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return successResponse(res, messages)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch messages', 500)
  }
})

const messageSchema = z.object({ content: z.string().min(1).max(2000), attachmentUrl: z.string().optional() })

router.post('/:id/messages', authMiddleware, validateBody(messageSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } })
    if (!dispute) return errorResponse(res, 'Dispute not found', 404)

    const isCustomer = dispute.customerId === req.user!.id
    const isSeller = dispute.sellerId === req.user!.id
    const isAdmin = req.user!.isAdmin

    if (!isCustomer && !isSeller && !isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const senderRole = isAdmin ? 'ADMIN' : isCustomer ? 'CUSTOMER' : 'SELLER'

    const message = await prisma.disputeMessage.create({
      data: {
        disputeId: req.params.id,
        senderId: req.user!.id,
        senderRole,
        content: req.body.content,
        attachmentUrl: req.body.attachmentUrl,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    })

    const recipientId = isCustomer ? dispute.sellerId : dispute.customerId
    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'DISPUTE_MESSAGE',
          title: 'New dispute message',
          message: `A new message was added to dispute for order ${dispute.orderId}`,
          data: JSON.stringify({ disputeId: dispute.id }),
        },
      })
    }

    return successResponse(res, message, 201, 'Message added')
  } catch (error) {
    return errorResponse(res, 'Failed to add message', 500)
  }
})

export default router
