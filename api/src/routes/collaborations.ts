import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, optionalAuthMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { errorResponse, successResponse, validateBody } from '../types/express'
import { assertCollaborationActive, calculateCollaborationFinancials, collaborationTypes, expireCollaborations } from '../services/collaborations'
import { availableQuantity, expireReservations, lockInventoryRow } from '../services/reservations'
import { findShippingZone } from './seller-store'
import { generateOrderNumber } from '../utils/orderNumber'
import { normalizeDeliveryType, normalizeFulfillmentMethod } from '../utils/deliveryRules'

const router = Router()
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  type: z.enum(collaborationTypes),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  bundlePrice: z.number().positive().optional(),
  rules: z.string().max(4000).optional(),
})
const productSchema = z.object({ productId: z.string().min(1), variantId: z.string().min(1).optional(), quantity: z.number().int().positive().default(1), sortOrder: z.number().int().min(0).default(0) })
const inviteSchema = z.object({ shopId: z.string().min(1), message: z.string().max(500).optional() })
const responseSchema = z.object({ action: z.enum(['ACCEPT', 'DECLINE']) })
const cartSchema = z.object({ quantity: z.number().int().positive().default(1) })
const checkoutSchema = z.object({ deliveryAddress: z.string().min(5), deliveryLatitude: z.number().optional(), deliveryLongitude: z.number().optional(), deliveryType: z.preprocess(value => normalizeDeliveryType(String(value)), z.enum(['DELIVERY', 'PICKUP'])).default('DELIVERY'), fulfillmentMethod: z.string().transform(normalizeFulfillmentMethod).default('FIND_IT_NEAR_ME_RIDER'), notes: z.string().max(1000).optional() })

async function ownedShop(userId: string) {
  return prisma.shop.findFirst({ where: { ownerId: userId, status: 'ACTIVE' }, select: { id: true, name: true, slug: true, logo: true } })
}

function publicInclude() {
  return {
    ownerShop: { select: { id: true, name: true, slug: true, logo: true } },
    participants: { where: { status: 'ACCEPTED' }, select: { shop: { select: { id: true, name: true, slug: true, logo: true, location: true } }, sellerId: true } },
    products: { orderBy: { sortOrder: 'asc' as const }, include: { product: { select: { id: true, name: true, price: true, originalPrice: true, stock: true, status: true, shopId: true, images: { orderBy: { sortOrder: 'asc' as const }, take: 1, select: { url: true } } } }, variant: { select: { id: true, name: true, price: true, originalPrice: true, stock: true, isActive: true } }, shop: { select: { id: true, name: true, logo: true } } } },
  }
}

router.get('/public', async (_req, res) => {
  await expireCollaborations()
  const collaborations = await prisma.collaboration.findMany({ where: { status: 'ACTIVE', OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }] }, include: publicInclude(), orderBy: { createdAt: 'desc' }, take: 50 })
  return successResponse(res, collaborations)
})

router.get('/admin', authMiddleware, requireRole(['ADMIN']), async (_req: AuthenticatedRequest, res) => {
  const [collaborations, activeCount, orderCount, commission] = await Promise.all([
    prisma.collaboration.findMany({ include: { ownerShop: { select: { name: true } }, participants: { include: { shop: { select: { name: true } } } }, products: { select: { id: true } }, allocations: { select: { platformFee: true, netAmount: true, status: true } } }, orderBy: { updatedAt: 'desc' }, take: 100 }),
    prisma.collaboration.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count({ where: { collaborationId: { not: null }, status: { notIn: ['CANCELLED', 'FAILED', 'PENDING_PAYMENT'] } } }),
    prisma.collaborationAllocation.aggregate({ _sum: { platformFee: true } }),
  ])
  return successResponse(res, { collaborations, summary: { activeCount, orderCount, platformCommission: commission._sum.platformFee || 0 } })
})

router.patch('/admin/:id/status', authMiddleware, requireRole(['ADMIN']), validateBody(z.object({ status: z.enum(['PAUSED', 'ACTIVE', 'CANCELLED', 'COMPLETED']) })), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findUnique({ where: { id: req.params.id } })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  const updated = await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: req.body.status } })
  await prisma.auditLog.create({ data: { actorId: req.user!.id, actorRole: 'ADMIN', action: `COLLABORATION_${req.body.status}`, targetType: 'COLLABORATION', targetId: collaboration.id, metadata: JSON.stringify({ previousStatus: collaboration.status, nextStatus: req.body.status }) } })
  return successResponse(res, updated)
})

router.get('/:id', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  await expireCollaborations()
  const collaboration = await prisma.collaboration.findUnique({ where: { id: req.params.id }, include: publicInclude() })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  const isOwner = req.user?.id === collaboration.ownerSellerId
  const isParticipant = Boolean(req.user && collaboration.participants.some(participant => participant.sellerId === req.user!.id))
  if (!isOwner && !isParticipant && collaboration.status !== 'ACTIVE') return errorResponse(res, 'Collaboration not found', 404)
  return successResponse(res, collaboration)
})

router.post('/:id/cart', optionalAuthMiddleware, validateBody(cartSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const collaboration = await prisma.collaboration.findUnique({ where: { id: req.params.id }, include: { products: { orderBy: { sortOrder: 'asc' } } } })
    if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
    assertCollaborationActive(collaboration)
    const financials = await calculateCollaborationFinancials(collaboration.id)
    const sessionId = req.user ? undefined : String((req as any).headers?.['x-session-id'] || `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    const cart = req.user ? await prisma.cart.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id }, update: {} }) : await prisma.cart.upsert({ where: { sessionId }, create: { sessionId }, update: {} })
    const created = []
    for (const line of financials.lines) {
      const contribution = collaboration.products.find(item => item.id === line.collaborationProductId)!
      const product = await prisma.product.findFirst({ where: { id: line.productId, shopId: line.shopId, sellerId: line.sellerId, status: 'ACTIVE', stock: { gte: contribution.quantity }, shop: { status: 'ACTIVE' } }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, shop: { select: { id: true, allowGuestCheckout: true } } } })
      if (!product) return errorResponse(res, 'A collaboration product is no longer available', 409)
      if (!req.user && product.shop.allowGuestCheckout === false) return errorResponse(res, 'Sign in before buying this collaboration', 403, 'GUEST_CHECKOUT_REQUIRES_AUTH')
      const allocatedTotal = financials.allocations.get(line.collaborationProductId) || 0
      const unitPrice = allocatedTotal / 100 / contribution.quantity
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: product.id, variantId: line.variantId, collaborationId: collaboration.id, collaborationProductId: contribution.id } })
      const item = existing
        ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + contribution.quantity, price: unitPrice } })
        : await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, variantId: line.variantId, quantity: contribution.quantity, price: unitPrice, name: product.name, image: product.images[0]?.url || '', shopId: product.shopId, collaborationId: collaboration.id, collaborationProductId: contribution.id } })
      created.push(item)
    }
    return successResponse(res, { cartId: cart.id, collaborationId: collaboration.id, items: created }, 201, 'Collaboration added to cart')
  } catch (error: any) {
    return errorResponse(res, error.message || 'Unable to add collaboration to cart', 409)
  }
})

router.post('/:id/checkout', authMiddleware, requireRole(['USER']), validateBody(checkoutSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const collaboration = await prisma.collaboration.findUnique({ where: { id: req.params.id }, include: { products: { orderBy: { sortOrder: 'asc' } } } })
    if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
    assertCollaborationActive(collaboration)
    if (req.body.deliveryType === 'PICKUP' && req.body.fulfillmentMethod !== 'CUSTOMER_PICKUP') return errorResponse(res, 'Pickup orders must use customer pickup', 400)
    const financials = await calculateCollaborationFinancials(collaboration.id)
    const shopIds = Array.from(new Set(financials.lines.map(line => line.shopId)))
    const shops = await prisma.shop.findMany({ where: { id: { in: shopIds }, status: 'ACTIVE' }, select: { id: true, ownerId: true, name: true, deliveryAvailable: true, pickupAvailable: true, platformDeliveryFee: true, sellerDeliveryFee: true, campus: true, location: true, latitude: true, longitude: true } })
    if (shops.length !== shopIds.length) return errorResponse(res, 'A collaboration shop is no longer available', 409)
    const deliveryFees = new Map<string, number>()
    for (const shop of shops) {
      if (req.body.deliveryType === 'DELIVERY') {
        if (!shop.deliveryAvailable) return errorResponse(res, `${shop.name} does not offer delivery`, 400)
        const zone = await findShippingZone(shop.id, req.body.deliveryAddress)
        if (zone) deliveryFees.set(shop.id, Number(zone.deliveryFee))
        else deliveryFees.set(shop.id, Number(shop.platformDeliveryFee || shop.sellerDeliveryFee || 0))
      } else {
        if (!shop.pickupAvailable) return errorResponse(res, `${shop.name} does not offer pickup`, 400)
        deliveryFees.set(shop.id, 0)
      }
    }
    const order = await prisma.$transaction(async tx => {
      const lineData: Array<{ line: typeof financials.lines[number]; product: any; contribution: any; allocatedCents: number; commissionCents: number; payoutCents: number }> = []
      const commissionLines = Array.from(financials.allocations.entries()).map(([key, value]) => ({ key, baseCents: value }))
      const commissionAllocations = new Map<string, number>()
      const totalCommissionCents = Math.round(financials.platformFee * 100)
      let assignedCommission = 0
      commissionLines.forEach((item, index) => { const value = index === commissionLines.length - 1 ? totalCommissionCents - assignedCommission : Math.floor(totalCommissionCents * item.baseCents / Math.max(1, financials.customerSubtotal * 100)); commissionAllocations.set(item.key, value); assignedCommission += value })
      for (const line of financials.lines) {
        const contribution = collaboration.products.find(item => item.id === line.collaborationProductId)!
        await lockInventoryRow(tx, line.productId, line.variantId || undefined)
        await expireReservations(tx, line.productId)
        const product = await tx.product.findFirst({ where: { id: line.productId, shopId: line.shopId, sellerId: line.sellerId, status: 'ACTIVE' }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: { where: { id: line.variantId || undefined, isActive: true }, take: 1 } } })
        if (!product) throw new Error('A collaboration product is no longer available')
        const variant = line.variantId ? product.variants[0] : null
        const stock = variant?.stock ?? product.stock
        const available = await availableQuantity(tx, product.id, stock, line.variantId || undefined)
        if (available < contribution.quantity) throw new Error(`Insufficient stock for ${product.name}`)
        const allocatedCents = financials.allocations.get(line.collaborationProductId) || 0
        const commissionCents = commissionAllocations.get(line.collaborationProductId) || 0
        const payoutCents = financials.sellerAllocations.get(line.collaborationProductId) || 0
        lineData.push({ line, product, contribution, allocatedCents, commissionCents, payoutCents })
      }
      const deliveryTotal = Array.from(deliveryFees.values()).reduce((sum, fee) => sum + fee, 0)
      const newOrder = await tx.order.create({ data: { orderNumber: generateOrderNumber(), customerId: req.user!.id, total: financials.customerSubtotal + deliveryTotal, status: 'PENDING_PAYMENT', deliveryAddress: req.body.deliveryAddress, deliveryLatitude: req.body.deliveryLatitude ?? null, deliveryLongitude: req.body.deliveryLongitude ?? null, deliveryFee: deliveryTotal, fulfillmentMethod: req.body.fulfillmentMethod, notes: req.body.notes || null, originalSubtotal: financials.normalTotal, discountedSubtotal: financials.customerSubtotal, collaborationId: collaboration.id } })
      for (const item of lineData) {
        if (item.line.variantId) {
          const variantStockUpdate = await tx.productVariant.updateMany({ where: { id: item.line.variantId, productId: item.product.id, isActive: true, stock: { gte: item.contribution.quantity } }, data: { stock: { decrement: item.contribution.quantity } } })
          if (variantStockUpdate.count !== 1) throw new Error(`Insufficient stock for ${item.product.name}`)
        }
        const productStockUpdate = await tx.product.updateMany({ where: { id: item.product.id, status: 'ACTIVE', stock: { gte: item.contribution.quantity } }, data: { stock: { decrement: item.contribution.quantity } } })
        if (productStockUpdate.count !== 1) throw new Error(`Insufficient stock for ${item.product.name}`)
        const orderItem = await tx.orderItem.create({ data: { orderId: newOrder.id, productId: item.product.id, variantId: item.line.variantId, collaborationId: collaboration.id, collaborationProductId: item.contribution.id, shopId: item.line.shopId, sellerId: item.line.sellerId, quantity: item.contribution.quantity, price: item.allocatedCents / 100 / item.contribution.quantity, allocatedPrice: item.allocatedCents / 100, platformCommission: item.commissionCents / 100, sellerPayout: item.payoutCents / 100, name: item.product.name, image: item.product.images[0]?.url || '' } })
        await tx.collaborationAllocation.create({ data: { collaborationId: collaboration.id, orderId: newOrder.id, orderItemId: orderItem.id, collaborationProductId: item.contribution.id, shopId: item.line.shopId, sellerId: item.line.sellerId, grossAmount: item.allocatedCents / 100, platformFee: item.commissionCents / 100, netAmount: item.payoutCents / 100, remainingNetAmount: item.payoutCents / 100 } })
      }
      await tx.payment.create({ data: { orderId: newOrder.id, amount: newOrder.total, method: 'paystack', provider: 'PAYSTACK', transactionRef: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` } })
      await tx.financialLedger.create({ data: { orderId: newOrder.id, userId: req.user!.id, type: 'ORDER_PAYMENT', amount: newOrder.total, currency: 'GHS', status: 'PENDING', reference: newOrder.orderNumber, description: `Collaboration order payment for ${newOrder.orderNumber}` } })
      for (const shop of shops) {
        const shipment = await tx.collaborationShipment.create({ data: { collaborationId: collaboration.id, orderId: newOrder.id, shopId: shop.id, sellerId: shop.ownerId, deliveryAddress: req.body.deliveryAddress, deliveryLatitude: req.body.deliveryLatitude ?? null, deliveryLongitude: req.body.deliveryLongitude ?? null, deliveryFee: deliveryFees.get(shop.id) || 0, fulfillmentMethod: req.body.fulfillmentMethod } })
        if (req.body.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER') {
          await tx.delivery.create({ data: { orderId: null, collaborationShipmentId: shipment.id, riderId: null, pickupLocation: shop.location, dropoffLocation: req.body.deliveryAddress, pickupAddress: shop.location, dropoffAddress: req.body.deliveryAddress, pickupLatitude: shop.latitude, pickupLongitude: shop.longitude, dropoffLatitude: req.body.deliveryLatitude ?? null, dropoffLongitude: req.body.deliveryLongitude ?? null, status: 'PENDING', fee: deliveryFees.get(shop.id) || 0 } })
        }
        await tx.notification.create({ data: { userId: shop.ownerId, type: 'COLLABORATION_SALE', title: 'New collaboration sale', message: `A customer purchased an item from ${collaboration.name}.`, data: JSON.stringify({ collaborationId: collaboration.id, orderId: newOrder.id }) } })
      }
      return tx.order.findUnique({ where: { id: newOrder.id }, include: { items: true, payment: true, collaborationAllocations: true, collaborationShipments: true } })
    })
    return successResponse(res, order, 201, 'Collaboration order created')
  } catch (error: any) {
    return errorResponse(res, error.message || 'Unable to create collaboration order', 409)
  }
})

router.get('/', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  await expireCollaborations()
  const shop = await ownedShop(req.user!.id)
  if (!shop) return successResponse(res, { collaborations: [], invitations: [] })
  const [collaborations, invitations] = await Promise.all([
    prisma.collaboration.findMany({ where: { OR: [{ ownerSellerId: req.user!.id }, { participants: { some: { sellerId: req.user!.id } } }] }, include: publicInclude(), orderBy: { updatedAt: 'desc' } }),
    prisma.collaborationInvitation.findMany({ where: { inviteeSellerId: req.user!.id, status: 'PENDING' }, include: { collaboration: { select: { id: true, name: true, description: true, startsAt: true, endsAt: true, bundlePrice: true } }, inviterShop: { select: { id: true, name: true, logo: true } } }, orderBy: { createdAt: 'desc' } }),
  ])
  return successResponse(res, { collaborations, invitations })
})

router.post('/', authMiddleware, requireRole(['SELLER']), validateBody(createSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await ownedShop(req.user!.id)
  if (!shop) return errorResponse(res, 'Create an active shop before starting a collaboration', 403)
  if (req.body.startsAt && req.body.endsAt && req.body.endsAt <= req.body.startsAt) return errorResponse(res, 'End date must be after start date', 400)
  if (req.body.type !== 'BUNDLE' && req.body.bundlePrice !== undefined) return errorResponse(res, 'Only product bundles may define a bundle price', 400)
  const collaboration = await prisma.collaboration.create({ data: { ...req.body, coverImage: req.body.coverImage || null, ownerShopId: shop.id, ownerSellerId: req.user!.id, participants: { create: { shopId: shop.id, sellerId: req.user!.id, role: 'OWNER', status: 'ACCEPTED', acceptedAt: new Date() } } }, include: publicInclude() })
  return successResponse(res, collaboration, 201, 'Collaboration created')
})

router.post('/:id/invitations', authMiddleware, requireRole(['SELLER']), validateBody(inviteSchema), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findFirst({ where: { id: req.params.id, ownerSellerId: req.user!.id } })
  if (!collaboration || ['CANCELLED', 'COMPLETED', 'EXPIRED'].includes(collaboration.status)) return errorResponse(res, 'Collaboration is not available for invitations', 404)
  const inviter = await ownedShop(req.user!.id)
  const invitee = await prisma.shop.findFirst({ where: { id: req.body.shopId, status: 'ACTIVE' }, select: { id: true, ownerId: true, name: true } })
  if (!inviter || !invitee || invitee.id === inviter.id) return errorResponse(res, 'Invitee shop is invalid', 400)
  const invitation = await prisma.collaborationInvitation.upsert({ where: { collaborationId_inviteeShopId: { collaborationId: collaboration.id, inviteeShopId: invitee.id } }, create: { collaborationId: collaboration.id, inviterShopId: inviter.id, inviterSellerId: req.user!.id, inviteeShopId: invitee.id, inviteeSellerId: invitee.ownerId, message: req.body.message }, update: { status: 'PENDING', message: req.body.message, respondedAt: null } })
  await prisma.collaborationParticipant.upsert({ where: { collaborationId_shopId: { collaborationId: collaboration.id, shopId: invitee.id } }, create: { collaborationId: collaboration.id, shopId: invitee.id, sellerId: invitee.ownerId, status: 'PENDING_ACCEPTANCE' }, update: { sellerId: invitee.ownerId, status: 'PENDING_ACCEPTANCE', acceptedAt: null } })
  await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'PENDING_ACCEPTANCE' } })
  await prisma.notification.create({ data: { userId: invitee.ownerId, type: 'COLLABORATION_INVITATION', title: `Invitation to collaborate on ${collaboration.name}`, message: `${inviter.name} invited your shop to collaborate.`, data: JSON.stringify({ collaborationId: collaboration.id, invitationId: invitation.id }) } })
  return successResponse(res, invitation, 201, 'Invitation sent')
})

router.post('/invitations/:id/respond', authMiddleware, requireRole(['SELLER']), validateBody(responseSchema), async (req: AuthenticatedRequest, res) => {
  const invitation = await prisma.collaborationInvitation.findFirst({ where: { id: req.params.id, inviteeSellerId: req.user!.id, status: 'PENDING' }, include: { collaboration: true, inviteeShop: true, inviterShop: true } })
  if (!invitation) return errorResponse(res, 'Invitation not found', 404)
  const accepted = req.body.action === 'ACCEPT'
  await prisma.$transaction(async tx => {
    await tx.collaborationInvitation.update({ where: { id: invitation.id }, data: { status: accepted ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() } })
    await tx.collaborationParticipant.update({ where: { collaborationId_shopId: { collaborationId: invitation.collaborationId, shopId: invitation.inviteeShopId } }, data: { status: accepted ? 'ACCEPTED' : 'DECLINED', acceptedAt: accepted ? new Date() : null } })
    const acceptedParticipants = await tx.collaborationParticipant.count({ where: { collaborationId: invitation.collaborationId, status: { not: 'ACCEPTED' } } })
    if (accepted && acceptedParticipants === 0) await tx.collaboration.update({ where: { id: invitation.collaborationId }, data: { status: 'DRAFT' } })
    await tx.notification.create({ data: { userId: invitation.collaboration.ownerSellerId, type: accepted ? 'COLLABORATION_ACCEPTED' : 'COLLABORATION_DECLINED', title: `${invitation.inviteeShop.name} ${accepted ? 'accepted' : 'declined'} your invitation`, message: `${invitation.collaboration.name} invitation response received.`, data: JSON.stringify({ collaborationId: invitation.collaborationId, invitationId: invitation.id }) } })
  })
  return successResponse(res, { status: accepted ? 'ACCEPTED' : 'DECLINED' })
})

router.post('/:id/products', authMiddleware, requireRole(['SELLER']), validateBody(productSchema), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findUnique({ where: { id: req.params.id }, include: { participants: true } })
  const shop = await ownedShop(req.user!.id)
  if (!collaboration || !shop) return errorResponse(res, 'Collaboration not found', 404)
  const participant = collaboration.participants.find(item => item.shopId === shop.id && item.status === 'ACCEPTED')
  if (!participant) return errorResponse(res, 'Your shop has not accepted this collaboration', 403)
  const product = await prisma.product.findFirst({ where: { id: req.body.productId, shopId: shop.id, sellerId: req.user!.id, status: 'ACTIVE' }, select: { id: true } })
  if (!product) return errorResponse(res, 'You may only contribute your own active products', 403)
  if (req.body.variantId) {
    const variant = await prisma.productVariant.findFirst({ where: { id: req.body.variantId, productId: product.id, isActive: true }, select: { id: true } })
    if (!variant) return errorResponse(res, 'Variant not found', 400)
  }
  const item = await prisma.collaborationProduct.upsert({ where: { collaborationId_productId_variantId: { collaborationId: collaboration.id, productId: product.id, variantId: req.body.variantId || null } }, create: { collaborationId: collaboration.id, productId: product.id, variantId: req.body.variantId || null, shopId: shop.id, sellerId: req.user!.id, quantity: req.body.quantity, sortOrder: req.body.sortOrder }, update: { quantity: req.body.quantity, sortOrder: req.body.sortOrder } })
  return successResponse(res, item, 201)
})

router.post('/:id/activate', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findFirst({ where: { id: req.params.id, ownerSellerId: req.user!.id }, include: { participants: true } })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  if (collaboration.participants.some(item => item.status !== 'ACCEPTED')) return errorResponse(res, 'All invited shops must accept before activation', 409)
  try { const financials = await calculateCollaborationFinancials(collaboration.id); if (collaboration.type === 'BUNDLE' && collaboration.bundlePrice == null) return errorResponse(res, 'Bundle price is required', 400); if (!financials.lines.length) return errorResponse(res, 'Add at least one product', 400) } catch (error: any) { return errorResponse(res, error.message || 'Collaboration products are invalid', 400) }
  const active = await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'ACTIVE' }, include: publicInclude() })
  return successResponse(res, active, 200, 'Collaboration activated')
})

router.post('/:id/cancel', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findFirst({ where: { id: req.params.id, ownerSellerId: req.user!.id } })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  const updated = await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'CANCELLED' } })
  return successResponse(res, updated)
})

router.patch('/:id/status', authMiddleware, requireRole(['SELLER']), validateBody(z.object({ status: z.enum(['PAUSED', 'ACTIVE', 'COMPLETED', 'CANCELLED']) })), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findFirst({ where: { id: req.params.id, ownerSellerId: req.user!.id } })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  if (req.body.status === 'ACTIVE') {
    try { assertCollaborationActive({ ...collaboration, status: 'ACTIVE' }) } catch (error: any) { return errorResponse(res, error.message, 409) }
  }
  const updated = await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: req.body.status } })
  return successResponse(res, updated)
})

router.delete('/:id/participants/:shopId', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findFirst({ where: { id: req.params.id, ownerSellerId: req.user!.id } })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  const participant = await prisma.collaborationParticipant.findFirst({ where: { collaborationId: collaboration.id, shopId: req.params.shopId, role: { not: 'OWNER' } } })
  if (!participant) return errorResponse(res, 'Participant not found', 404)
  const contributed = await prisma.collaborationProduct.count({ where: { collaborationId: collaboration.id, shopId: participant.shopId } })
  if (contributed) return errorResponse(res, 'Remove this shop\'s contributed products before removing the participant', 409)
  await prisma.$transaction([
    prisma.collaborationParticipant.delete({ where: { id: participant.id } }),
    prisma.collaborationInvitation.deleteMany({ where: { collaborationId: collaboration.id, inviteeShopId: participant.shopId } }),
  ])
  return successResponse(res, null, 200, 'Participant removed')
})

router.get('/:id/financials', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const collaboration = await prisma.collaboration.findFirst({ where: { id: req.params.id, OR: [{ ownerSellerId: req.user!.id }, { participants: { some: { sellerId: req.user!.id, status: 'ACCEPTED' } } }] } })
  if (!collaboration) return errorResponse(res, 'Collaboration not found', 404)
  return successResponse(res, await calculateCollaborationFinancials(collaboration.id))
})

export default router
