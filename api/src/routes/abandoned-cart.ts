import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest, successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const cart = await prisma.cart.findFirst({ where: { userId: req.user!.id }, include: { items: true } })
  if (!cart || cart.items.length === 0) return successResponse(res, { cart: null, abandoned: null })

  const abandoned = await prisma.abandonedCart.findUnique({ where: { cartId: cart.id } })
  return successResponse(res, { cart, abandoned })
})

router.post('/recover', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { token } = req.body as { token?: string }
  if (!token) return errorResponse(res, 'Recovery token is required', 400)

  const abandoned = await prisma.abandonedCart.findFirst({
    where: { recoveryToken: token, recovered: false, expiresAt: { gte: new Date() } },
    include: { cart: { include: { items: true } } },
  })
  if (!abandoned) return errorResponse(res, 'Invalid or expired recovery link', 404)

  const userCart = await prisma.cart.findFirst({ where: { userId: req.user!.id } })
  if (!userCart) return errorResponse(res, 'Cart not found', 404)

  for (const item of abandoned.cart.items) {
    const existing = await prisma.cartItem.findFirst({ where: { cartId: userCart.id, productId: item.productId, serviceId: item.serviceId, variantId: item.variantId } })
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + item.quantity } })
    } else {
      await prisma.cartItem.create({ data: { ...item, cartId: userCart.id } })
    }
  }

  await prisma.abandonedCart.update({ where: { id: abandoned.id }, data: { recovered: true } })
  await prisma.cart.update({ where: { id: userCart.id }, data: { updatedAt: new Date() } })

  return successResponse(res, { recovered: true }, 200, 'Cart recovered')
})

export default router
