import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createSellerEarnings, createRiderEarnings } from '../services/earnings'
import { sendOrderConfirmationEmail, sendSellerOrderNotification } from '../services/email'
import { initializeTransaction, verifyTransaction } from '../services/paystack'
import { deliveryMethodError, normalizeDeliveryType, normalizeFulfillmentMethod } from '../utils/deliveryRules'
import { generateOrderNumber } from '../utils/orderNumber'

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
  deliveryAddress: z.string().min(5).optional(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  deliveryType: z.preprocess(value => normalizeDeliveryType(String(value)), z.enum(['DELIVERY', 'PICKUP'])).default('DELIVERY'),
  deliveryFee: z.number().min(0).default(0),
  notes: z.string().optional(),
  paymentMethod: z.string().default('paystack'),
  fulfillmentMethod: z.string().transform(normalizeFulfillmentMethod).default('FIND_IT_NEAR_ME_RIDER'),
})

const guestPaymentSchema = z.object({ orderId: z.string().min(1), email: z.string().email() })

router.post('/guest/paystack/initialize', validateBody(guestPaymentSchema), async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.body.orderId, guestEmail: req.body.email }, include: { payment: true } })
    if (!order?.payment) return errorResponse(res, 'Order payment not found', 404)
    const result = await initializeTransaction(req.body.email, Number(order.payment.amount), order.payment.transactionRef, `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout?orderId=${order.id}&guest=1&email=${encodeURIComponent(req.body.email)}`)
    return successResponse(res, { authorizationUrl: result.authorization_url, reference: result.reference })
  } catch (error) {
    return errorResponse(res, 'Unable to initialize Paystack payment', 400)
  }
})

router.post('/guest/verify-payment', validateBody(z.object({ orderId: z.string().min(1), email: z.string().email(), reference: z.string().min(1).max(100) })), async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.body.orderId, guestEmail: req.body.email }, include: { payment: true } })
    if (!order?.payment) return errorResponse(res, 'Order payment not found', 404)
    if (order.payment.status === 'PAID' && order.status === 'PAID') return successResponse(res, order, 200, 'Payment already verified')
    if (order.payment.transactionRef !== req.body.reference) return errorResponse(res, 'Invalid payment reference', 400)
    const transaction = await verifyTransaction(req.body.reference)
    if (transaction.status !== 'success' || transaction.currency !== 'GHS' || transaction.amount !== Math.round(Number(order.payment.amount) * 100)) return errorResponse(res, 'Payment could not be verified', 400)
    const updated = await prisma.$transaction(async tx => {
      await tx.payment.update({ where: { id: order.payment!.id }, data: { status: 'PAID', paidAt: new Date() } })
      return tx.order.update({ where: { id: order.id }, data: { status: 'PAID' }, include: { payment: true } })
    })
    return successResponse(res, updated, 200, 'Payment verified successfully')
  } catch (error) {
    return errorResponse(res, 'Payment verification failed', 400)
  }
})

router.post('/guest', validateBody(guestCheckoutSchema), async (req: AuthenticatedRequest, res) => {
  const { items, guestName, guestPhone, guestEmail, deliveryAddress: inputDeliveryAddress, deliveryLatitude, deliveryLongitude, deliveryType, deliveryFee, notes, paymentMethod, fulfillmentMethod } = req.body
  const resolvedFulfillmentMethod = deliveryType === 'PICKUP' ? 'CUSTOMER_PICKUP' : normalizeFulfillmentMethod(fulfillmentMethod)
  const deliveryAddress = deliveryType === 'PICKUP' ? 'Pickup from shop' : inputDeliveryAddress

  if (!guestName || !guestPhone) {
    return errorResponse(res, 'Guest name and phone are required', 400)
    }

  if (items.length === 0) {
    return errorResponse(res, 'Order must contain at least one item', 400)
  }
  if (deliveryType === 'DELIVERY' && !deliveryAddress) {
    return errorResponse(res, 'A delivery address is required', 400)
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
      const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { deliveryAvailable: true, pickupAvailable: true, sellerDeliveryAvailable: true } })
      const methodError = shop && deliveryMethodError(shop, deliveryType, resolvedFulfillmentMethod)
      if (methodError) return errorResponse(res, methodError, 400)
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
          orderNumber: generateOrderNumber(),
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
          deliveryLatitude: deliveryLatitude ?? null,
          deliveryLongitude: deliveryLongitude ?? null,
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
            pickupAddress: (await tx.shop.findUnique({ where: { id: group.shopId }, select: { location: true } }))?.location || 'Shop',
            dropoffAddress: deliveryAddress,
            pickupLatitude: (await tx.shop.findUnique({ where: { id: group.shopId }, select: { latitude: true } }))?.latitude ?? null,
            pickupLongitude: (await tx.shop.findUnique({ where: { id: group.shopId }, select: { longitude: true } }))?.longitude ?? null,
            dropoffLatitude: deliveryLatitude ?? null,
            dropoffLongitude: deliveryLongitude ?? null,
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
      shop: { include: { owner: { select: { id: true, name: true, email: true, avatar: true } } } },
      payment: true,
      sellerEarnings: true,
      riderEarnings: true,
    },
  })

  for (const order of fullOrders) {
    if (guestEmail) {
      const items = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
      }))
      sendOrderConfirmationEmail(guestEmail, {
        orderNumber: order.orderNumber,
        items,
        total: Number(order.total),
        deliveryMethod: order.fulfillmentMethod,
        paymentMethod: order.payment?.method,
        createdAt: order.createdAt.toISOString(),
      }).catch(err => console.error('Failed to send guest order confirmation email:', err))
    }

    const sellerEmail = order.shop?.owner?.email
    if (sellerEmail) {
      const items = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
      }))
      sendSellerOrderNotification(sellerEmail, {
        orderNumber: order.orderNumber,
        items,
        buyerName: guestName || 'Guest',
        deliveryAddress,
      }).catch(err => console.error('Failed to send seller notification email:', err))
    }
  }

  return successResponse(res, { orders: fullOrders }, 201, 'Guest orders created successfully')
})

export default router
