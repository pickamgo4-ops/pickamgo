import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { enforceAuthenticatedRateLimit } from '../middleware/rate-limit'
import { errorResponse, successResponse, validateBody } from '../types/express'
import { availableQuantity, canReserveQuantity, expireReservations, lockInventoryRow, reservationDurationMinutes } from '../services/reservations'

const router = Router()
const createSchema = z.object({ productId: z.string().min(1), variantId: z.string().optional(), quantity: z.number().int().positive().max(100) })

router.post('/', authMiddleware, requireRole(['USER']), validateBody(createSchema), async (req: AuthenticatedRequest, res) => {
  if (!(await enforceAuthenticatedRateLimit(req, res, 'write'))) return
  const { productId, variantId, quantity } = req.body
  try {
    const reservation = await prisma.$transaction(async tx => {
      await lockInventoryRow(tx, productId, variantId)
      await expireReservations(tx, productId)
      const product = await tx.product.findFirst({ where: { id: productId, status: 'ACTIVE', shop: { status: 'ACTIVE' } }, select: { id: true, name: true, stock: true, sellerId: true, allowReservations: true, variants: { where: { isActive: true }, select: { id: true, name: true, stock: true } } } })
      if (!product) throw Object.assign(new Error('Product is unavailable'), { code: 'UNAVAILABLE' })
      if (!product.allowReservations) throw Object.assign(new Error('Reservations are not available for this product'), { code: 'DISABLED' })
      if (product.variants.length && !variantId) throw Object.assign(new Error('Select a variant before reserving this product'), { code: 'VARIANT_REQUIRED' })
      const variant = variantId ? product.variants.find(item => item.id === variantId) : null
      if (variantId && !variant) throw Object.assign(new Error('Variant is unavailable'), { code: 'UNAVAILABLE' })
      const existing = await tx.productReservation.findFirst({ where: { productId: product.id, variantId: variant?.id || null, userId: req.user!.id, status: 'ACTIVE', expiresAt: { gt: new Date() } } })
      if (existing) throw Object.assign(new Error('You already have an active reservation for this item'), { code: 'ALREADY_RESERVED' })
      const stock = variant ? variant.stock : product.stock
      const remaining = await availableQuantity(tx, product.id, stock, variant?.id)
      if (!canReserveQuantity(stock, stock - remaining, quantity)) throw Object.assign(new Error(`Only ${remaining} available to reserve`), { code: 'INSUFFICIENT_STOCK' })
      const minutes = await reservationDurationMinutes(tx)
      return tx.productReservation.create({ data: { productId: product.id, variantId: variant?.id || null, userId: req.user!.id, quantity, expiresAt: new Date(Date.now() + minutes * 60 * 1000) }, include: { product: { select: { name: true, sellerId: true } }, variant: { select: { name: true } } } })
    }, { isolationLevel: 'Serializable' })
    await prisma.notification.create({ data: { userId: req.user!.id, type: 'RESERVATION_CREATED', title: 'Reservation confirmed', message: `${reservation.product.name}${reservation.variant?.name ? ` - ${reservation.variant.name}` : ''} is reserved until ${reservation.expiresAt.toLocaleTimeString()}.`, data: JSON.stringify({ reservationId: reservation.id, productId, variantId: reservation.variantId, path: `/account/reservations` }) } })
    await prisma.notification.create({ data: { userId: reservation.product.sellerId, type: 'PRODUCT_RESERVED', title: 'Product reserved', message: `${reservation.product.name}${reservation.variant?.name ? ` - ${reservation.variant.name}` : ''} has been reserved.`, data: JSON.stringify({ reservationId: reservation.id, productId, path: `/seller/reservations` }) } })
    return successResponse(res, reservation, 201, 'Reservation confirmed')
  } catch (error: any) {
    if (['UNAVAILABLE', 'VARIANT_REQUIRED', 'INSUFFICIENT_STOCK', 'DISABLED', 'ALREADY_RESERVED'].includes(error?.code)) return errorResponse(res, error.message, ['INSUFFICIENT_STOCK', 'ALREADY_RESERVED'].includes(error.code) ? 409 : 400)
    if (error?.code === 'P2034') return errorResponse(res, 'Inventory changed while reserving. Please try again.', 409)
    console.error('Failed to create reservation:', error)
    return errorResponse(res, 'Failed to reserve item', 500)
  }
})

router.get('/', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    await expireReservations(prisma, undefined, req.user!.id)
    const reservations = await prisma.productReservation.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, quantity: true, status: true, createdAt: true, expiresAt: true, cancelledAt: true, convertedAt: true, orderId: true, product: { select: { id: true, name: true, price: true, stock: true, status: true, images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 } } }, variant: { select: { id: true, name: true, price: true, stock: true, isActive: true } } } })
    return successResponse(res, reservations)
  } catch { return errorResponse(res, 'Failed to load reservations', 500) }
})

router.get('/seller', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const products = await prisma.product.findMany({ where: { sellerId: req.user!.id }, select: { id: true, name: true, stock: true, variants: { select: { id: true, name: true, stock: true } } } })
    const productIds = products.map(product => product.id)
    await Promise.all(productIds.map(productId => expireReservations(prisma, productId)))
    const reservations = await prisma.productReservation.findMany({ where: { productId: { in: productIds }, status: 'ACTIVE', expiresAt: { gt: new Date() } }, select: { productId: true, variantId: true, quantity: true, expiresAt: true, product: { select: { name: true, stock: true } }, variant: { select: { name: true, stock: true } } } })
    const grouped = new Map<string, any>()
    for (const reservation of reservations) { const key = `${reservation.productId}:${reservation.variantId || 'product'}`; const item = grouped.get(key) || { productId: reservation.productId, productName: reservation.product.name, variantId: reservation.variantId, variantName: reservation.variant?.name || null, physicalStock: reservation.variant?.stock ?? reservation.product.stock, reservedQuantity: 0, availableQuantity: 0, latestExpiry: reservation.expiresAt }; item.reservedQuantity += reservation.quantity; if (reservation.expiresAt > item.latestExpiry) item.latestExpiry = reservation.expiresAt; item.availableQuantity = Math.max(0, item.physicalStock - item.reservedQuantity); grouped.set(key, item) }
    return successResponse(res, Array.from(grouped.values()).sort((a, b) => b.reservedQuantity - a.reservedQuantity))
  } catch { return errorResponse(res, 'Failed to load reservation inventory', 500) }
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await expireReservations(prisma, undefined, req.user!.id)
    const reservation = await prisma.productReservation.findFirst({ where: { id: req.params.id, userId: req.user!.id }, include: { product: { select: { id: true, name: true, price: true, stock: true, status: true } }, variant: { select: { id: true, name: true, price: true, stock: true, isActive: true } } } })
    if (!reservation) return errorResponse(res, 'Reservation not found', 404)
    return successResponse(res, reservation)
  } catch { return errorResponse(res, 'Failed to load reservation', 500) }
})

router.delete('/:id', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const reservation = await prisma.productReservation.findFirst({ where: { id: req.params.id, userId: req.user!.id, status: 'ACTIVE', expiresAt: { gt: new Date() } } })
    if (!reservation) return errorResponse(res, 'Reservation is no longer active', 409)
    await prisma.productReservation.update({ where: { id: reservation.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
    return successResponse(res, null, 200, 'Reservation cancelled')
  } catch { return errorResponse(res, 'Failed to cancel reservation', 500) }
})

router.post('/:id/add-to-cart', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    await expireReservations(prisma, undefined, req.user!.id)
    const reservation = await prisma.productReservation.findFirst({ where: { id: req.params.id, userId: req.user!.id, status: 'ACTIVE', expiresAt: { gt: new Date() }, product: { status: 'ACTIVE' } }, include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, shop: { select: { id: true, name: true, status: true } } } }, variant: true } })
    if (!reservation || reservation.product.shop.status !== 'ACTIVE') return errorResponse(res, 'Reservation is no longer available', 409)
    const stock = reservation.variant?.stock ?? reservation.product.stock
    const remaining = await availableQuantity(prisma, reservation.productId, stock, reservation.variantId || undefined, reservation.id)
    if (remaining < reservation.quantity) return errorResponse(res, 'The reserved quantity is no longer available', 409)
    const cart = await prisma.cart.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } })
    const conflict = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: reservation.productId, variantId: reservation.variantId || null, reservationId: null } })
    if (conflict) return errorResponse(res, 'Remove the existing product from your cart before adding this reservation', 409)
    const item = await prisma.cartItem.create({ data: { cartId: cart.id, productId: reservation.productId, variantId: reservation.variantId, reservationId: reservation.id, quantity: reservation.quantity, price: reservation.variant?.price || reservation.product.price, name: reservation.product.name, image: reservation.product.images[0]?.url || '', shopId: reservation.product.shopId } })
    return successResponse(res, item, 201, 'Reserved item added to cart')
  } catch { return errorResponse(res, 'Failed to add reservation to cart', 500) }
})

export default router
