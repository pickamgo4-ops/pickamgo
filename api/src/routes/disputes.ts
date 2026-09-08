import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createAuditEntry } from '../utils/auditLog'

const router = Router()
const disputeStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED'] as const

const disputeSchema = z.object({
  orderId: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
})

const disputeStatusSchema = z.object({
  status: z.enum(disputeStatuses),
  resolution: z.string().max(2000).optional(),
})

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
    const status = typeof req.query.status === 'string' ? req.query.status : ''
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const sort = req.query.sort === 'oldest' ? 'asc' : 'desc'
    const and: any[] = []

    if (!req.user!.isAdmin) {
      and.push({ OR: [{ customerId: req.user!.id }, { sellerId: req.user!.id }] })
    }
    if (status) {
      if (!disputeStatuses.includes(status as typeof disputeStatuses[number])) return errorResponse(res, 'Invalid dispute status', 400)
      and.push({ status })
    }
    if (search) {
      and.push({
        OR: [
          { id: { contains: search } },
          { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { email: { contains: search, mode: 'insensitive' } } },
          { seller: { name: { contains: search, mode: 'insensitive' } } },
          { seller: { email: { contains: search, mode: 'insensitive' } } },
        ],
      })
    }
    if (typeof req.query.dateFrom === 'string' && req.query.dateFrom) {
      const dateFrom = new Date(req.query.dateFrom)
      if (Number.isNaN(dateFrom.getTime())) return errorResponse(res, 'Invalid dateFrom', 400)
      and.push({ createdAt: { gte: dateFrom } })
    }
    if (typeof req.query.dateTo === 'string' && req.query.dateTo) {
      const dateTo = new Date(req.query.dateTo)
      if (Number.isNaN(dateTo.getTime())) return errorResponse(res, 'Invalid dateTo', 400)
      dateTo.setHours(23, 59, 59, 999)
      and.push({ createdAt: { lte: dateTo } })
    }

    const where = and.length ? { AND: and } : {}
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          seller: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          order: { select: { id: true, orderNumber: true, total: true, status: true, createdAt: true, shop: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: sort },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ])

    return successResponse(res, {
      disputes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Failed to fetch disputes:', error)
    return errorResponse(res, 'Failed to fetch disputes', 500)
  }
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

    const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'DISPUTE_OPENED',
          title: 'New dispute requires review',
          message: `A dispute was opened for order ${order.orderNumber}`,
          data: JSON.stringify({ disputeId: dispute.id, orderId }),
        })),
      })
    }

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

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        seller: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        order: {
          include: {
            shop: { select: { id: true, name: true, slug: true } },
            items: { include: { product: true, service: true } },
            payment: true,
          },
        },
        messages: { include: { sender: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!dispute) return errorResponse(res, 'Dispute not found', 404)

    const isParticipant = dispute.customerId === req.user!.id || dispute.sellerId === req.user!.id
    if (!req.user!.isAdmin && !isParticipant) return errorResponse(res, 'Not authorized', 403)

    const history = req.user!.isAdmin
      ? await prisma.auditLog.findMany({ where: { targetType: 'DISPUTE', targetId: dispute.id }, orderBy: { createdAt: 'asc' }, include: { actor: { select: { id: true, name: true, email: true } } } })
      : []
    return successResponse(res, { ...dispute, history })
  } catch (error) {
    console.error('Failed to fetch dispute:', error)
    return errorResponse(res, 'Failed to fetch dispute', 500)
  }
})

router.patch('/:id/status', authMiddleware, validateBody(disputeStatusSchema), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const { id } = req.params
    const { status, resolution } = req.body

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
      const changed = await tx.dispute.updateMany({ where: { id, status: dispute.status }, data: { status, ...(resolution !== undefined ? { resolution } : {}), updatedAt: new Date() } })
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

    const participantIds = [updated.customerId, updated.sellerId].filter((id): id is string => !!id)
    if (participantIds.length) {
      await prisma.notification.createMany({
        data: participantIds.map(userId => ({
          userId,
          type: 'DISPUTE_STATUS_UPDATE',
          title: 'Dispute status updated',
          message: `Your dispute is now ${status.replace(/_/g, ' ').toLowerCase()}`,
          data: JSON.stringify({ disputeId: updated.id, orderId: updated.orderId, status }),
        })),
      })
    }

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
