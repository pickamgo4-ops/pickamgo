import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendNewMessageEmail } from '../services/email'

const router = Router()

const messageSchema = z.object({
  content: z.string().min(1),
  orderId: z.string().min(1).optional(),
})

async function resolveAccess(currentUserId: string, otherUserId: string, orderId?: string) {
  if (currentUserId === otherUserId) return null

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order || !order.customerId || order.fulfillmentMethod !== 'FIND_IT_NEAR_ME_RIDER' || order.riderId === null) return null
    const isRiderChat = (currentUserId === order.customerId && otherUserId === order.riderId) ||
      (currentUserId === order.riderId && otherUserId === order.customerId)
    if (!isRiderChat) return null
    return { shopId: undefined, orderId: order.id, closedAt: ['CANCELLED', 'DELIVERED', 'FAILED'].includes(order.status) ? new Date() : undefined }
  }

  const shop = await prisma.shop.findFirst({ where: { ownerId: otherUserId, status: { not: 'SUSPENDED' } } })
  if (shop) {
    return { shopId: shop.id, orderId: undefined, closedAt: undefined }
  }

  const sellerOrder = await prisma.order.findFirst({ where: { sellerId: currentUserId, customerId: otherUserId } })
  if (sellerOrder) return { shopId: sellerOrder.shopId, orderId: undefined, closedAt: undefined }
  return null
}

function otherParticipant(conversation: any, userId: string) {
  return conversation.participant1Id === userId ? conversation.participant2 : conversation.participant1
}

router.get('/conversations', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        participant1: { select: { id: true, name: true, avatar: true } },
        participant2: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
        order: { select: { orderNumber: true, status: true } },
        _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return successResponse(res, conversations.map((conversation) => ({
      ...conversation,
      otherParticipant: otherParticipant(conversation, userId),
      lastMessage: conversation.messages[0] || null,
      unreadCount: conversation._count.messages,
    })))
  } catch (error) {
    return errorResponse(res, 'Failed to fetch conversations', 500)
  }
})

router.get('/conversations/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const otherUserId = req.params.userId

    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined
    const access = await resolveAccess(currentUserId, otherUserId, orderId)
    let conversation = await prisma.conversation.findFirst({
      where: {
        ...(orderId ? { orderId } : { shopId: access?.shopId }),
        OR: [{ participant1Id: currentUserId, participant2Id: otherUserId }, { participant1Id: otherUserId, participant2Id: currentUserId }],
      },
      include: {
        participant1: { select: { id: true, name: true, avatar: true } },
        participant2: { select: { id: true, name: true, avatar: true } },
        order: { select: { orderNumber: true, status: true } },
      },
    })

    if (!conversation && !access) return errorResponse(res, 'You are not allowed to access this conversation', 403)

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: currentUserId,
          participant2Id: otherUserId,
          shopId: access?.shopId,
          orderId: access?.orderId,
          closedAt: access?.closedAt,
        },
        include: {
          participant1: { select: { id: true, name: true, avatar: true } },
          participant2: { select: { id: true, name: true, avatar: true } },
          order: { select: { orderNumber: true, status: true } },
        },
      })
    }

    if (!conversation) return errorResponse(res, 'Conversation could not be loaded', 500)

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })

    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderId: { not: currentUserId }, isRead: false },
      data: { isRead: true },
    })

    return successResponse(res, { conversation, messages, canSend: !conversation.closedAt && !access?.closedAt })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch messages', 500)
  }
})

router.post('/conversations/:userId/messages', authMiddleware, validateBody(messageSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const otherUserId = req.params.userId
    const { content, orderId } = req.body

    const access = await resolveAccess(currentUserId, otherUserId, orderId)
    if (!access) return errorResponse(res, 'You are not allowed to message this user', 403)
    if (access.closedAt) return errorResponse(res, 'This conversation is closed', 403)

    let conversation = await prisma.conversation.findFirst({
      where: {
        ...(orderId ? { orderId } : { shopId: access.shopId }),
        OR: [{ participant1Id: currentUserId, participant2Id: otherUserId }, { participant1Id: otherUserId, participant2Id: currentUserId }],
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: currentUserId,
          participant2Id: otherUserId,
          shopId: access.shopId,
          orderId: access.orderId,
          closedAt: access.closedAt,
        },
      })
    }

    if (conversation.closedAt) return errorResponse(res, 'This conversation is closed', 403)

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUserId,
        content,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: 'New message',
        message: `${req.user!.name} sent you a message`,
        data: JSON.stringify({ conversationId: conversation.id, orderId: conversation.orderId }),
      },
    })

    const recipient = await prisma.user.findUnique({ where: { id: otherUserId }, select: { email: true } })
    if (recipient?.email) {
      sendNewMessageEmail(recipient.email, req.user!.name).catch(err => console.error('Failed to send message email:', err))
    }

    return successResponse(res, message, 201, 'Message sent')
  } catch (error) {
    return errorResponse(res, 'Failed to send message', 500)
  }
})

export default router
