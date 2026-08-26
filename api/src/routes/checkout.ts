import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createSellerEarnings, createRiderEarnings } from '../services/earnings'
import { handleWebhook, initializeTransaction, verifyTransaction } from '../services/paystack'
import { sendOrderConfirmationEmail, sendPaymentConfirmationEmail, sendSellerOrderNotification } from '../services/email'
import { deliveryMethodError, normalizeDeliveryType, normalizeFulfillmentMethod } from '../utils/deliveryRules'
import { generateOrderNumber } from '../utils/orderNumber'

const router = Router()

const fulfillmentMethods = ['FIND_IT_NEAR_ME_RIDER', 'SELLER_OWN_DELIVERY', 'CUSTOMER_PICKUP'] as const

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().optional(),
    serviceId: z.string().optional(),
    variantId: z.string().optional(),
    quantity: z.number().min(1).default(1),
  })).min(1),
  deliveryAddress: z.string().min(5).optional(),
  deliveryType: z.preprocess(value => normalizeDeliveryType(String(value)), z.enum(['DELIVERY', 'PICKUP'])).default('DELIVERY'),
  deliveryFee: z.number().min(0).optional(),
  addressId: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().transform(value => value.toLowerCase()).refine(value => value === 'paystack', 'Only Paystack payments are supported').default('paystack'),
  fulfillmentMethod: z.string().transform(normalizeFulfillmentMethod).default('FIND_IT_NEAR_ME_RIDER'),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
})

const paymentVerificationSchema = z.object({
  orderId: z.string().min(1),
  reference: z.string().min(1).max(100),
})

router.post('/paystack/webhook', async (req, res) => {
  try {
    const result = await handleWebhook(req.body, req.headers['x-paystack-signature'] as string | undefined)
    if (result.status !== 'SUCCESS' || !result.payment?.reference || result.payment.status !== 'success') {
      return res.status(200).json({ success: true })
    }

    const reference = result.payment.reference as string
    const payment = await prisma.payment.findUnique({ where: { transactionRef: reference } })
    if (!payment) return res.status(200).json({ success: true })

    const paymentUpdated = await prisma.$transaction(async tx => {
      const updatedPayment = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: 'PAID' } },
        data: { status: 'PAID', paidAt: new Date() },
      })
      if (updatedPayment.count === 1) {
        await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } })
        await tx.financialLedger.updateMany({ where: { orderId: payment.orderId, type: 'ORDER_PAYMENT' }, data: { status: 'SUCCESS', reference } })
      }
      return updatedPayment.count === 1
    })

    if (paymentUpdated) {
      const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { customer: { select: { email: true } } } })
      if (order?.customer?.email) {
        sendPaymentConfirmationEmail(order.customer.email, { orderNumber: order.orderNumber, amount: Number(payment.amount) }).catch(err => console.error('Failed to send payment email:', err))
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid Paystack webhook' })
  }
})

router.post('/verify-payment', authMiddleware, requireRole(['USER']), validateBody(paymentVerificationSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, reference } = req.body
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: req.user!.id },
      include: { payment: true },
    })
    if (!order || !order.payment) return errorResponse(res, 'Order payment not found', 404)
    if (order.payment.status === 'PAID' && order.status === 'PAID') return successResponse(res, order, 200, 'Payment already verified')
    if (order.payment.transactionRef !== reference) return errorResponse(res, 'Invalid payment reference', 400)

    const transaction = await verifyTransaction(reference)
    const expectedAmount = Math.round(Number(order.payment.amount) * 100)
    if (transaction.status !== 'success' || transaction.currency !== 'GHS' || transaction.amount !== expectedAmount || transaction.reference !== reference) {
      return errorResponse(res, 'Payment could not be verified', 400)
    }

    const result = await prisma.$transaction(async tx => {
      const updatedPayment = await tx.payment.updateMany({
        where: { id: order.payment!.id },
        data: { status: 'PAID', paidAt: new Date(), transactionRef: reference },
      })
      if (updatedPayment.count !== 1) return { order: order, paymentUpdated: false }
      await tx.order.updateMany({ where: { id: order.id, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } })
      await tx.financialLedger.updateMany({ where: { orderId: order.id, type: 'ORDER_PAYMENT' }, data: { status: 'SUCCESS', reference } })
      return { order: await tx.order.findUnique({ where: { id: order.id }, include: { payment: true } }), paymentUpdated: true }
    })
    if (result.paymentUpdated && req.user!.email) {
      sendPaymentConfirmationEmail(req.user!.email, { orderNumber: order.orderNumber, amount: Number(order.payment.amount) }).catch(err => console.error('Failed to send payment email:', err))
    }
    return successResponse(res, result.order, 200, 'Payment verified successfully')
  } catch (error) {
    return errorResponse(res, 'Payment verification failed', 400)
  }
})

router.post('/paystack/initialize', authMiddleware, requireRole(['USER']), validateBody(z.object({ orderId: z.string().min(1) })), async (req: AuthenticatedRequest, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.body.orderId, customerId: req.user!.id }, include: { payment: true } })
    if (!order?.payment) return errorResponse(res, 'Order payment not found', 404)
    if (order.payment.status === 'PAID') return errorResponse(res, 'Order is already paid', 400)
    const result = await initializeTransaction(req.user!.email, Number(order.payment.amount), order.payment.transactionRef, `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout?orderId=${order.id}`)
    return successResponse(res, { authorizationUrl: result.authorization_url, reference: result.reference })
  } catch (error) {
    return errorResponse(res, 'Unable to initialize Paystack payment', 400)
  }
})

router.post('/', authMiddleware, requireRole(['USER']), validateBody(checkoutSchema), async (req: AuthenticatedRequest, res) => {
  const { items, deliveryType, addressId, notes, paymentMethod, fulfillmentMethod } = req.body
  const resolvedFulfillmentMethod = deliveryType === 'PICKUP' ? 'CUSTOMER_PICKUP' : normalizeFulfillmentMethod(fulfillmentMethod)

  const selectedAddress = addressId
    ? await prisma.address.findFirst({ where: { id: addressId, userId: req.user!.id } })
    : null
  if (deliveryType === 'DELIVERY' && !selectedAddress && !req.body.deliveryAddress) {
    return errorResponse(res, 'A delivery address is required', 400)
  }
  if (addressId && !selectedAddress) return errorResponse(res, 'Selected address was not found', 404)
  const deliveryAddress = deliveryType === 'PICKUP'
    ? 'Pickup from shop'
    : selectedAddress?.address || req.body.deliveryAddress
  const deliveryLatitude = selectedAddress?.latitude ?? req.body.deliveryLatitude ?? null
  const deliveryLongitude = selectedAddress?.longitude ?? req.body.deliveryLongitude ?? null

  if (items.length === 0) {
    return errorResponse(res, 'Order must contain at least one item', 400)
  }

  const orderItems: any[] = []
  const shopGroups: Map<string, { shopId: string; sellerId: string; items: any[]; deliveryFee: number }> = new Map()
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
        return errorResponse(res, `Insufficient stock for ${product.name}. Only ${product.stock} left.`, 400)
      }

      const shop = await prisma.shop.findUnique({ where: { id: product.shopId } })
      if (!shop || shop.status === 'SUSPENDED' || shop.status === 'CLOSED') {
        return errorResponse(res, `Shop for ${product.name} is not available`, 400)
      }

      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant || !variant.isActive || variant.productId !== product.id) {
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

      const shop = await prisma.shop.findUnique({ where: { id: service.shopId } })
      if (!shop || shop.status === 'SUSPENDED' || shop.status === 'CLOSED') {
        return errorResponse(res, `Shop for ${service.name} is not available`, 400)
      }

      itemPrice = Number(service.price)
      itemName = service.name
      itemImage = service.images[0]?.url || ''
      shopId = service.shopId
      sellerId = service.providerId
      serviceId = service.id
    }

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
      const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { platformDeliveryFee: true, sellerDeliveryFee: true, deliveryAvailable: true, pickupAvailable: true, sellerDeliveryAvailable: true } })
      const methodError = shop && deliveryMethodError(shop, deliveryType, resolvedFulfillmentMethod)
      if (methodError) return errorResponse(res, methodError, 400)
      const serverDeliveryFee = deliveryType === 'DELIVERY'
        ? Number(shop?.platformDeliveryFee || shop?.sellerDeliveryFee || 0)
        : 0
      shopGroups.set(shopId, { shopId, sellerId, items: [], deliveryFee: serverDeliveryFee })
    }
    shopGroups.get(shopId)!.items.push(orderItem)
  }

  const orders = await prisma.$transaction(async (tx) => {
    const createdOrders: any[] = []

    for (const [shopId, group] of shopGroups) {
      const shopTotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + group.deliveryFee

      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: req.user!.id,
          shopId: group.shopId,
          sellerId: group.sellerId,
          total: shopTotal,
          status: 'PENDING_PAYMENT',
          deliveryAddress,
          deliveryLatitude,
          deliveryLongitude,
          deliveryFee: group.deliveryFee,
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
          const stockUpdate = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity }, status: 'ACTIVE' },
            data: { stock: { decrement: item.quantity } },
          })
          if (stockUpdate.count !== 1) {
            throw new Error('Product stock changed while creating the order')
          }

          if (item.variantId) {
            const variantStockUpdate = await tx.productVariant.updateMany({
              where: { id: item.variantId, productId: item.productId, isActive: true, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            })
            if (variantStockUpdate.count !== 1) {
              throw new Error('Variant stock changed while creating the order')
            }
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
          userId: req.user!.id,
          type: 'ORDER_PAYMENT',
          amount: shopTotal,
          currency: 'GHS',
          status: 'PENDING',
          reference: newOrder.orderNumber,
          description: `Order payment for ${newOrder.orderNumber}`,
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
            dropoffLatitude: deliveryLatitude,
            dropoffLongitude: deliveryLongitude,
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
          message: `You have a new order ${newOrder.orderNumber} for GH₵${shopTotal.toFixed(2)}`,
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
        customer: { select: { id: true, name: true, email: true, avatar: true } },
        sellerEarnings: true,
        riderEarnings: true,
      },
    })

    const userCart = await prisma.cart.findUnique({ where: { userId: req.user!.id } })
    if (userCart) {
      await prisma.cartItem.deleteMany({ where: { cartId: userCart.id } })
    }

    for (const order of fullOrders) {
      const customerEmail = order.customer?.email
      if (customerEmail) {
        const items = order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
        }))
        sendOrderConfirmationEmail(customerEmail, {
          orderNumber: order.orderNumber,
          items,
          total: Number(order.total),
          deliveryMethod: order.fulfillmentMethod,
          paymentMethod: order.payment?.method,
          createdAt: order.createdAt.toISOString(),
        }).catch(err => console.error('Failed to send order confirmation email:', err))
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
          buyerName: order.customer?.name || 'Guest',
          deliveryAddress: order.deliveryAddress,
        }).catch(err => console.error('Failed to send seller notification email:', err))
      }
    }

  if (addressId) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user!.id },
    })
    if (address) {
      for (const order of fullOrders) {
        await prisma.order.update({
          where: { id: order.id },
          data: { deliveryAddress: `${address.address}, ${address.area || address.city}` },
        })
      }
    }
  }

  return successResponse(res, { orders: fullOrders }, 201, 'Orders created successfully')
})

export default router
