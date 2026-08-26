import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createSellerEarnings, createRiderEarnings } from '../services/earnings'
import { sendOrderStatusEmail } from '../services/email'
import { deliveryMethodError, normalizeDeliveryType, normalizeFulfillmentMethod } from '../utils/deliveryRules'
import { generateOrderNumber } from '../utils/orderNumber'

const router = Router()

const orderStatusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED']),
})

const fulfillmentMethods = ['FIND_IT_NEAR_ME_RIDER', 'SELLER_OWN_DELIVERY', 'CUSTOMER_PICKUP'] as const

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().optional(),
    serviceId: z.string().optional(),
    quantity: z.number().min(1).default(1),
  })).min(1),
  deliveryAddress: z.string().min(5),
  deliveryFee: z.number().min(0).default(0),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),
  fulfillmentMethod: z.string().transform(normalizeFulfillmentMethod).default('FIND_IT_NEAR_ME_RIDER'),
})

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const status = req.query.status as string | undefined

  let where: any = {}

  if (req.user!.isAdmin) {
    if (status) where.status = status
  } else if (req.user!.isSeller) {
    where.sellerId = req.user!.id
    if (status) where.status = status
  } else {
    where.customerId = req.user!.id
    if (status) where.status = status
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true, service: true } },
        shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
        seller: { select: { id: true, name: true, avatar: true } },
        customer: { select: { id: true, name: true, avatar: true } },
        rider: { select: { id: true, name: true, avatar: true } },
        payment: true,
        delivery: true,
        sellerEarnings: true,
        riderEarnings: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return successResponse(res, {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { product: true, service: true } },
      shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
      seller: { select: { id: true, name: true, avatar: true } },
      customer: { select: { id: true, name: true, avatar: true, phone: true } },
      rider: { select: { id: true, name: true, avatar: true } },
      payment: true,
      delivery: true,
      sellerEarnings: true,
      riderEarnings: true,
    },
  })

  if (!order) return errorResponse(res, 'Order not found', 404)

  const isAuthorized = req.user!.isAdmin ||
    order.customerId === req.user!.id ||
    order.sellerId === req.user!.id ||
    (order.riderId === req.user!.id)

  if (!isAuthorized) return errorResponse(res, 'Not authorized to view this order', 403)

  return successResponse(res, order)
})

router.post('/', authMiddleware, requireRole(['USER']), validateBody(createOrderSchema), async (req: AuthenticatedRequest, res) => {
  const { items, deliveryAddress, deliveryFee, deliveryLatitude, deliveryLongitude, fulfillmentMethod } = req.body

  if (items.length === 0) {
    return errorResponse(res, 'Order must contain at least one item', 400)
  }

  const orderItems: any[] = []
  let total = deliveryFee

  for (const item of items) {
    if (!item.productId && !item.serviceId) {
      return errorResponse(res, 'Each item must have a productId or serviceId', 400)
    }

    if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { images: true },
      })
      if (!product || product.status !== 'ACTIVE') {
        return errorResponse(res, `Product ${item.productId} is not available`, 400)
      }
      if (product.stock < item.quantity) {
        return errorResponse(res, `Insufficient stock for ${product.name}`, 400)
      }

      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0]?.url || '',
        quantity: item.quantity,
      })

      total += Number(product.price) * item.quantity
    }

    if (item.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: item.serviceId },
        include: { images: true },
      })
      if (!service || service.status !== 'ACTIVE') {
        return errorResponse(res, `Service ${item.serviceId} is not available`, 400)
      }

      orderItems.push({
        serviceId: service.id,
        name: service.name,
        price: service.price,
        image: service.images[0]?.url || '',
        quantity: item.quantity,
      })

      total += Number(service.price) * item.quantity
    }
  }

  const firstItem = orderItems[0]
  const shopId = firstItem.productId 
    ? (await prisma.product.findUnique({ where: { id: firstItem.productId } }))!.shopId
    : (await prisma.service.findUnique({ where: { id: firstItem.serviceId } }))!.shopId

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)
  const methodError = deliveryMethodError(shop, fulfillmentMethod === 'CUSTOMER_PICKUP' ? 'PICKUP' : normalizeDeliveryType('DELIVERY'), fulfillmentMethod)
  if (methodError) return errorResponse(res, methodError, 400)

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: req.user!.id,
        shopId: shop.id,
        sellerId: shop.ownerId,
        total,
        deliveryAddress,
        deliveryFee,
        fulfillmentMethod,
        status: 'PENDING_PAYMENT',
      },
    })

    for (const item of orderItems) {
      await tx.orderItem.create({
        data: { ...item, orderId: newOrder.id },
      })

      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    await tx.payment.create({
      data: {
        orderId: newOrder.id,
        amount: total,
        method: 'paystack',
        provider: 'PAYSTACK',
        transactionRef: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    })

    await tx.financialLedger.create({
      data: {
        orderId: newOrder.id,
        userId: req.user!.id,
        type: 'ORDER_PAYMENT',
        amount: total,
        currency: 'GHS',
        status: 'PENDING',
        reference: newOrder.orderNumber,
        description: `Order payment for ${newOrder.orderNumber}`,
      },
    })

    await createSellerEarnings(newOrder.id, tx)

    if (fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER') {
      const shopSettings = await tx.shop.findUnique({
        where: { id: shop.id },
        select: { platformDeliveryFee: true, sellerDeliveryFee: true },
      })

      const deliveryFee = shopSettings?.platformDeliveryFee || shopSettings?.sellerDeliveryFee || 10

      const newDelivery = await tx.delivery.create({
        data: {
          orderId: newOrder.id,
          riderId: null,
          pickupLocation: shop.location,
          dropoffLocation: deliveryAddress,
          pickupAddress: shop.location,
          dropoffAddress: deliveryAddress,
          pickupLatitude: shop.latitude,
          pickupLongitude: shop.longitude,
          dropoffLatitude: deliveryLatitude ?? null,
          dropoffLongitude: deliveryLongitude ?? null,
          status: 'PENDING',
          fee: deliveryFee,
        },
      })

    }

    return newOrder
  })

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: true,
      shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
      payment: true,
      sellerEarnings: true,
      riderEarnings: true,
    },
  })

  return successResponse(res, fullOrder, 201, 'Order created successfully')
})

router.patch('/:id/status', authMiddleware, validateBody(orderStatusSchema), async (req: AuthenticatedRequest, res) => {
  const { status } = req.body

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) return errorResponse(res, 'Order not found', 404)

  const isSeller = order.sellerId === req.user!.id
  const isAdmin = req.user!.isAdmin
  const isRider = order.riderId === req.user!.id && order.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER'

  if (!isSeller && !isAdmin && !isRider) {
    return errorResponse(res, 'Not authorized to update this order', 403)
  }

  if (status === 'DELIVERED' && isSeller && !isAdmin && order.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER') {
    return errorResponse(res, 'Only the assigned PickAmGo rider can complete platform delivery orders', 403)
  }

  const validTransitions: Record<string, string[]> = {
    PENDING_PAYMENT: ['PAID', 'CANCELLED', 'FAILED'],
    PAID: ['CONFIRMED', 'CANCELLED', 'FAILED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
    READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'DELIVERED'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    FAILED: [],
  }

  const allowed = validTransitions[order.status] || []
  if (!allowed.includes(status)) {
    return errorResponse(res, `Cannot change status from ${order.status} to ${status}`, 400)
  }

  if (isSeller && !isAdmin) {
    const sellerAllowed = order.fulfillmentMethod === 'CUSTOMER_PICKUP'
      ? { PREPARING: ['READY_FOR_PICKUP'], READY_FOR_PICKUP: ['DELIVERED'] }
      : order.fulfillmentMethod === 'SELLER_OWN_DELIVERY'
        ? { PREPARING: ['OUT_FOR_DELIVERY'], OUT_FOR_DELIVERY: ['DELIVERED'] }
        : { PAID: ['CONFIRMED'], CONFIRMED: ['PREPARING'], PREPARING: ['READY_FOR_PICKUP'] }
    if (!(sellerAllowed[order.status as keyof typeof sellerAllowed] || []).includes(status)) {
      return errorResponse(res, `Invalid ${order.fulfillmentMethod.toLowerCase().replace(/_/g, ' ')} status transition`, 400)
    }
  }

  const updateData: any = { status, updatedAt: new Date() }

  if (status === 'DELIVERED') {
    updateData.payoutEligible = true
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      items: true,
      customer: { select: { id: true, name: true, email: true, avatar: true } },
      shop: { include: { owner: { select: { id: true, name: true, email: true, avatar: true } } } },
    },
  })

  const previousStatus = order.status

  if (status === 'DELIVERED') {
    await prisma.sellerEarnings.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { status: 'AVAILABLE', availableAt: new Date() },
    })

    if (order.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER') {
      await prisma.riderEarnings.updateMany({
        where: { orderId: order.id, status: 'PENDING' },
        data: { status: 'AVAILABLE', availableAt: new Date() },
      })
    }

    await prisma.financialLedger.updateMany({
      where: { orderId: order.id, type: 'SELLER_EARNING' },
      data: { status: 'AVAILABLE' },
    })
  }

  if (status === 'CONFIRMED' || status === 'PREPARING' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
    if (order.customerId) {
      await prisma.notification.create({
        data: {
          userId: order.customerId,
          type: status === 'DELIVERED' ? 'ORDER_DELIVERED' : 'ORDER_STATUS_UPDATE',
          title: 'Order Update',
          message: `Your order ${order.orderNumber} is now ${status.replace('_', ' ').toLowerCase()}`,
          data: JSON.stringify({ orderId: order.id, status }),
        },
      })

      const customerEmail = updated.customer?.email
      if (customerEmail) {
        sendOrderStatusEmail(customerEmail, {
          orderNumber: updated.orderNumber,
          status: status.replace(/_/g, ' ').toLowerCase(),
          previousStatus: previousStatus ? previousStatus.replace(/_/g, ' ').toLowerCase() : undefined,
        }).catch(err => console.error('Failed to send order status email:', err))
      }
    }
  }

  return successResponse(res, updated, undefined, 'Order status updated')
})

export default router
