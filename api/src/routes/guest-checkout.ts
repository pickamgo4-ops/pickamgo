import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createSellerEarnings, createRiderEarnings } from '../services/earnings'

const router = Router()

const fulfillmentMethods = ['FIND_IT_NEAR_ME_RIDER', 'SELLER_OWN_DELIVERY', 'CUSTOMER_PICKUP'] as const

const guestCheckoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().optional(),
    serviceId: z.string().optional(),
    variantId: z.string().optional(),
    quantity: z.number().min(1).default(1),
  })).min(1),
  guestName: z.string().min(2).optional(),
  guestPhone: z.string().min(10).optional(),
  guestEmail: z.string().email().optional(),
  deliveryAddress: z.string().min(5),
  deliveryType: z.enum(['DELIVERY', 'PICKUP']).default('DELIVERY'),
  deliveryFee: z.number().min(0).default(0),
  notes: z.string().optional(),
  paymentMethod: z.string().default('paystack'),
  fulfillmentMethod: z.enum(fulfillmentMethods).default('FIND_IT_NEAR_ME_RIDER'),
})

router.post('/guest', validateBody(guestCheckoutSchema), async (req: AuthenticatedRequest, res) => {
  const { items, guestName, guestPhone, guestEmail, deliveryAddress, deliveryType, deliveryFee, notes, paymentMethod, fulfillmentMethod } = req.body
  const resolvedFulfillmentMethod = deliveryType === 'PICKUP' ? 'CUSTOMER_PICKUP' : fulfillmentMethod

  if (!guestName || !guestPhone) {
    return errorResponse(res, 'Guest name and phone are required', 400)
    }

  if (items.length === 0) {
    return errorResponse(res, 'Order must contain at least one item', 400)
  }

  const orderItems: any[] = []
  const shopGroups: Map<string, { shopId: string; sellerId: string; items: any[] }> = new Map()
  let total = deliveryFee

  for (const item of items) {
    if (!item.productId && !item.serviceId) {
      return errorResponse(res, 'Each item must have a productId or serviceId', 400)
    }

    let itemPrice = 0
    let itemName = ''
    let itemImage = ''
    let productId: string | undefined
    let serviceId: string | undefined
    let shopId = ''
    let sellerId = ''

    if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          shop: { select: { id: true, ownerId: true } },
        },
      })

      if (!product || product.status !== 'ACTIVE') {
        return errorResponse(res, `Product ${item.productId} is not available`, 400)
      }

      if (product.stock < item.quantity) {
        return errorResponse(res, `Insufficient stock for ${product.name}`, 400)
      }

      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant || !variant.isActive) {
          return errorResponse(res, 'Variant not found or unavailable', 404)
        }
        if (variant.stock < item.quantity) {
          return errorResponse(res, `Insufficient stock for selected variant`, 400)
        }
        itemPrice = Number(variant.price || product.price)
      } else {
        itemPrice = Number(product.price)
      }

      itemName = product.name
      itemImage = product.images[0]?.url || ''
      shopId = product.shopId
      sellerId = product.sellerId
      productId = product.id
    }

    if (item.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: item.serviceId },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          shop: { select: { id: true, ownerId: true } },
        },
      })

      if (!service || service.status !== 'ACTIVE') {
        return errorResponse(res, `Service ${item.serviceId} is not available`, 400)
      }

      itemPrice = Number(service.price)
      itemName = service.name
      itemImage = service.images[0]?.url || ''
      shopId = service.shopId
      sellerId = service.providerId
      serviceId = service.id
    }

    const lineTotal = itemPrice * item.quantity
    total += lineTotal

    const orderItem = {
      productId,
      serviceId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      price: itemPrice,
      name: itemName,
      image: itemImage,
    }

    if (!shopGroups.has(shopId)) {
      shopGroups.set(shopId, { shopId, sellerId, items: [] })
    }
    shopGroups.get(shopId)!.items.push(orderItem)
  }

  const orders = await prisma.$transaction(async (tx) => {
    const createdOrders: any[] = []

    for (const [shopId, group] of shopGroups) {
      const shopTotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + (deliveryType === 'DELIVERY' ? deliveryFee : 0)

      const newOrder = await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          customerId: null,
          guestName,
          guestPhone,
          guestEmail: guestEmail || null,
          shopId: group.shopId,
          sellerId: group.sellerId,
          total: shopTotal,
          status: 'PENDING_PAYMENT',
          deliveryAddress,
          deliveryFee: deliveryType === 'DELIVERY' ? deliveryFee : 0,
          deliveryStatus: 'PENDING',
          fulfillmentMethod: resolvedFulfillmentMethod,
          notes: notes || null,
        },
      })

      for (const item of group.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId || null,
            serviceId: item.serviceId || null,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            image: item.image,
          },
        })

        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })

          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            })
          }
        }
      }

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: shopTotal,
          method: paymentMethod,
          provider: paymentMethod.toUpperCase(),
          transactionRef: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        },
      })

      await tx.financialLedger.create({
        data: {
          orderId: newOrder.id,
          userId: null,
          type: 'ORDER_PAYMENT',
          amount: shopTotal,
          currency: 'GHS',
          status: 'PENDING',
          reference: newOrder.orderNumber,
          description: `Guest order payment for ${newOrder.orderNumber}`,
        },
      })

      await createSellerEarnings(newOrder.id, tx)

      if (resolvedFulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER') {
        const shopSettings = await tx.shop.findUnique({
          where: { id: group.shopId },
          select: { platformDeliveryFee: true, sellerDeliveryFee: true },
        })

        const deliveryFee = shopSettings?.platformDeliveryFee || shopSettings?.sellerDeliveryFee || 10

        const newDelivery = await tx.delivery.create({
          data: {
            orderId: newOrder.id,
            riderId: null,
            pickupLocation: 'Shop',
            dropoffLocation: deliveryAddress,
            pickupAddress: 'Shop',
            dropoffAddress: deliveryAddress,
            status: 'PENDING',
            fee: deliveryFee,
          },
        })

      }

      await tx.notification.create({
        data: {
          userId: group.sellerId,
          type: 'NEW_ORDER',
          title: 'New Order Received',
          message: `You have a new guest order ${newOrder.orderNumber} for GH₵${shopTotal.toFixed(2)}`,
          data: JSON.stringify({ orderId: newOrder.id }),
        },
      })

      createdOrders.push(newOrder)
    }

    return createdOrders
  })

  const fullOrders = await prisma.order.findMany({
    where: { id: { in: orders.map(o => o.id) } },
    include: {
      items: true,
      shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
      payment: true,
      sellerEarnings: true,
      riderEarnings: true,
    },
  })

  return successResponse(res, { orders: fullOrders }, 201, 'Guest orders created successfully')
})

export default router
