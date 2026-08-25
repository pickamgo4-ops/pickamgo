import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const messageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1),
})

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
          where: { isRead: false },
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return successResponse(res, conversations)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch conversations', 500)
  }
})

router.get('/conversations/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const otherUserId = req.params.userId

    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: currentUserId, participant2Id: otherUserId },
          { participant1Id: otherUserId, participant2Id: currentUserId },
        ],
      },
      include: {
        participant1: { select: { id: true, name: true, avatar: true } },
        participant2: { select: { id: true, name: true, avatar: true } },
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: currentUserId,
          participant2Id: otherUserId,
        },
        include: {
          participant1: { select: { id: true, name: true, avatar: true } },
          participant2: { select: { id: true, name: true, avatar: true } },
        },
      })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })

    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderId: { not: currentUserId }, isRead: false },
      data: { isRead: true },
    })

    return successResponse(res, { conversation, messages })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch messages', 500)
  }
})

router.post('/conversations/:userId/messages', authMiddleware, validateBody(messageSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const otherUserId = req.params.userId
    const { content } = req.body

    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: currentUserId, participant2Id: otherUserId },
          { participant1Id: otherUserId, participant2Id: currentUserId },
        ],
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: currentUserId,
          participant2Id: otherUserId,
        },
      })
    }

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

    return successResponse(res, message, 201, 'Message sent')
  } catch (error) {
    return errorResponse(res, 'Failed to send message', 500)
  }
})

export default router
