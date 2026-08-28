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
    if (!order || !order.customerId) return null

    const participants = [order.customerId, order.sellerId, order.riderId].filter(Boolean)
    const isParticipantPair = participants.includes(currentUserId) && participants.includes(otherUserId)
    const riderPair = order.riderId && (currentUserId === order.riderId || otherUserId === order.riderId)
    if (!isParticipantPair || (riderPair && order.riderId === null)) return null

    return {
      shopId: order.shopId,
      orderId: order.id,
      closedAt: ['CANCELLED', 'DELIVERED', 'FAILED'].includes(order.status) ? new Date() : undefined,
    }
  }

  const shop = await prisma.shop.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { ownerId: otherUserId },
        { products: { some: { sellerId: otherUserId } } },
        { services: { some: { providerId: otherUserId } } },
      ],
    },
  })
  if (shop) {
    return { shopId: shop.id, orderId: undefined, closedAt: undefined }
  }

  return null
}

async function canAccessExistingConversation(currentUserId: string, otherUserId: string, conversation: any) {
  if (!conversation || (conversation.participant1Id !== currentUserId && conversation.participant2Id !== currentUserId)) return false
  if (conversation.participant1Id !== otherUserId && conversation.participant2Id !== otherUserId) return false

  if (conversation.orderId) {
    const access = await resolveAccess(currentUserId, otherUserId, conversation.orderId)
    return !!access
  }

  if (!conversation.shopId) return false
  const shop = await prisma.shop.findUnique({
    where: { id: conversation.shopId },
    select: { status: true },
  })
  return shop?.status === 'ACTIVE'
}

function otherParticipant(conversation: any, userId: string) {
  return conversation.participant1Id === userId ? conversation.participant2 : conversation.participant1
}

function mapMessage(message: any, receiverId: string) {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId,
    content: message.content,
    read: message.isRead || false,
    createdAt: message.createdAt,
  }
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
        order: { select: { id: true, orderNumber: true, status: true } },
        shop: { select: { id: true, name: true, logo: true } },
        _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return successResponse(res, conversations.map((conversation) => {
      const other = otherParticipant(conversation, userId)
      return {
        ...conversation,
        otherParticipant: other,
        lastMessage: conversation.messages[0] || null,
        unreadCount: conversation._count.messages,
      }
    }))
  } catch (error) {
    return errorResponse(res, 'Failed to fetch conversations', 500)
  }
})

router.get('/conversations/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const otherUserId = req.params.userId

    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined
    let conversation = await prisma.conversation.findFirst({
      where: {
        ...(orderId ? { orderId } : {}),
        OR: [{ participant1Id: currentUserId, participant2Id: otherUserId }, { participant1Id: otherUserId, participant2Id: currentUserId }],
      },
      include: {
        participant1: { select: { id: true, name: true, avatar: true } },
        participant2: { select: { id: true, name: true, avatar: true } },
        order: { select: { orderNumber: true, status: true } },
        shop: { select: { id: true, name: true, logo: true } },
      },
    })

    const existingConversationAccess = conversation
      ? await canAccessExistingConversation(currentUserId, otherUserId, conversation)
      : false
    const access = conversation && existingConversationAccess
      ? { shopId: conversation.shopId, orderId: conversation.orderId, closedAt: conversation.closedAt }
      : await resolveAccess(currentUserId, otherUserId, orderId)
    if (conversation && !existingConversationAccess && !access) {
      return errorResponse(res, 'You are not allowed to access this conversation', 403)
    }
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
          shop: { select: { id: true, name: true, logo: true } },
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

    return successResponse(res, {
      conversation,
      messages: messages.map((msg) => mapMessage(msg, otherUserId)),
      canSend: !conversation.closedAt && !access?.closedAt,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch messages', 500)
  }
})

router.post('/conversations/:userId/messages', authMiddleware, validateBody(messageSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const otherUserId = req.params.userId
    const { content, orderId } = req.body

    let conversation: any = await prisma.conversation.findFirst({
      where: {
        ...(orderId ? { orderId } : {}),
        OR: [{ participant1Id: currentUserId, participant2Id: otherUserId }, { participant1Id: otherUserId, participant2Id: currentUserId }],
      },
    })

    const existingConversationAccess = conversation
      ? await canAccessExistingConversation(currentUserId, otherUserId, conversation)
      : false
    const access = conversation && existingConversationAccess
      ? { shopId: conversation.shopId, orderId: conversation.orderId, closedAt: conversation.closedAt }
      : await resolveAccess(currentUserId, otherUserId, orderId)

    if (!access && !existingConversationAccess) {
      return errorResponse(res, 'You are not allowed to message this user', 403)
    }
    if (access?.closedAt || conversation?.closedAt) return errorResponse(res, 'This conversation is closed', 403)

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: currentUserId,
          participant2Id: otherUserId,
          shopId: access?.shopId,
          orderId: access?.orderId,
          closedAt: access?.closedAt,
        },
      })
    }

    if (conversation.closedAt) return errorResponse(res, 'This conversation is closed', 403)

    const message = await prisma.$transaction(async (transaction) => {
      const savedMessage = await transaction.message.create({
        data: {
          conversationId: conversation.id,
          senderId: currentUserId,
          content,
        },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
      })

      await transaction.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })

      return savedMessage
    })

    try {
      await prisma.notification.create({
        data: {
          userId: otherUserId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: `${req.user!.name} sent you a message`,
          data: JSON.stringify({ conversationId: conversation.id, orderId: conversation.orderId }),
        },
      })
    } catch (error) {
      console.error('Failed to create message notification:', error)
    }

    try {
      const recipient = await prisma.user.findUnique({ where: { id: otherUserId }, select: { email: true } })
      if (recipient?.email) {
        sendNewMessageEmail(recipient.email, req.user!.name).catch(err => console.error('Failed to send message email:', err))
      }
    } catch (error) {
      console.error('Failed to prepare message email:', error)
    }

    return successResponse(res, mapMessage(message, otherUserId), 201, 'Message sent')
  } catch (error) {
    console.error('Failed to send message:', error)
    return errorResponse(res, 'Failed to send message', 500)
  }
})

export default router
