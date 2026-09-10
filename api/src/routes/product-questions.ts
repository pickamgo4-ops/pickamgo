import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, optionalAuthMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { enforceAuthenticatedRateLimit } from '../middleware/rate-limit'
import { errorResponse, successResponse, validateBody } from '../types/express'

const router = Router()
const questionSchema = z.object({ question: z.string().trim().min(5).max(500) })
const answerSchema = z.object({ answer: z.string().trim().min(1).max(1000) })

router.get('/product/:productId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const questions = await prisma.productQuestion.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        answer: true,
        answeredAt: true,
        createdAt: true,
        buyerId: true,
        buyer: { select: { name: true } },
      },
    })
    return successResponse(res, questions.map(({ buyerId, buyer, ...item }) => ({
      ...item,
      buyerName: `${buyer.name.slice(0, 1)}.`,
      isOwner: req.user?.id === buyerId,
    })))
  } catch (error) {
    console.error('Failed to fetch product questions:', error)
    return errorResponse(res, 'Failed to load questions', 500)
  }
})

router.post('/product/:productId', authMiddleware, validateBody(questionSchema), async (req: AuthenticatedRequest, res) => {
  if (!(await enforceAuthenticatedRateLimit(req, res, 'message'))) return
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.productId, status: { notIn: ['DELETED', 'REMOVED'] } },
      select: { id: true, name: true, sellerId: true, shop: { select: { ownerId: true } } },
    })
    if (!product) return errorResponse(res, 'Product not found', 404)
    if (product.sellerId === req.user!.id || product.shop.ownerId === req.user!.id) return errorResponse(res, 'Sellers cannot ask questions about their own products', 403)

    const question = await prisma.productQuestion.create({
      data: { productId: product.id, buyerId: req.user!.id, question: req.body.question },
      select: { id: true, question: true, answer: true, answeredAt: true, createdAt: true },
    })
    await prisma.notification.create({
      data: {
        userId: product.sellerId,
        type: 'PRODUCT_QUESTION',
        title: 'New product question',
        message: `A buyer asked a question about ${product.name}.`,
        data: JSON.stringify({ productId: product.id, questionId: question.id }),
      },
    })
    return successResponse(res, question, 201, 'Question submitted')
  } catch (error) {
    console.error('Failed to create product question:', error)
    return errorResponse(res, 'Failed to submit question', 500)
  }
})

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const question = await prisma.productQuestion.findUnique({ where: { id: req.params.id }, select: { buyerId: true, answer: true } })
    if (!question) return errorResponse(res, 'Question not found', 404)
    if (question.buyerId !== req.user!.id) return errorResponse(res, 'You do not have permission to delete this question', 403)
    if (question.answer) return errorResponse(res, 'Answered questions cannot be deleted', 409)
    await prisma.productQuestion.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 200, 'Question deleted')
  } catch (error) {
    return errorResponse(res, 'Failed to delete question', 500)
  }
})

router.get('/seller', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const questions = await prisma.productQuestion.findMany({
      where: { product: { sellerId: req.user!.id } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, productId: true, question: true, answer: true, answeredAt: true, createdAt: true, product: { select: { name: true } } },
    })
    return successResponse(res, questions)
  } catch (error) {
    return errorResponse(res, 'Failed to load seller questions', 500)
  }
})

router.patch('/seller/:id/answer', authMiddleware, requireRole(['SELLER']), validateBody(answerSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const question = await prisma.productQuestion.findFirst({
      where: { id: req.params.id, product: { sellerId: req.user!.id } },
      select: { id: true, buyerId: true, product: { select: { name: true } } },
    })
    if (!question) return errorResponse(res, 'Question not found', 404)
    const updated = await prisma.productQuestion.update({ where: { id: question.id }, data: { answer: req.body.answer, answeredAt: new Date() }, select: { id: true, answer: true, answeredAt: true } })
    await prisma.notification.create({
      data: {
        userId: question.buyerId,
        type: 'PRODUCT_QUESTION_ANSWERED',
        title: 'Your product question was answered',
        message: `The seller answered your question about ${question.product.name}.`,
        data: JSON.stringify({ questionId: question.id }),
      },
    })
    return successResponse(res, updated, 200, 'Answer saved')
  } catch (error) {
    return errorResponse(res, 'Failed to save answer', 500)
  }
})

router.delete('/admin/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const question = await prisma.productQuestion.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!question) return errorResponse(res, 'Question not found', 404)
    await prisma.productQuestion.delete({ where: { id: question.id } })
    return successResponse(res, null, 200, 'Question removed')
  } catch (error) {
    return errorResponse(res, 'Failed to remove question', 500)
  }
})

export default router
