import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createSellerEarnings, createRiderEarnings, getPlatformCommissionRate } from '../services/earnings'
import { sendOrderConfirmationEmail, sendSellerOrderNotification } from '../services/email'
import { initializeTransaction, verifyTransaction } from '../services/paystack'
import { deliveryMethodError, normalizeDeliveryType, normalizeFulfillmentMethod } from '../utils/deliveryRules'
import { generateOrderNumber } from '../utils/orderNumber'
import { getAppUrl } from '../utils/url'
import { validatePromoCode, createPromoRedemption, incrementPromoUsage, calculateDiscount, doesPromoApplyToGroup, type PromoValidationResult } from '../services/promo'

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
  promoCode: z.string().optional(),
})

const guestPaymentSchema = z.object({ orderId: z.string().min(1), email: z.string().email() })

router.post('/guest/paystack/initialize', validateBody(guestPaymentSchema), async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.body.orderId, guestEmail: req.body.email }, include: { payment: true } })
    if (!order?.payment) return errorResponse(res, 'Order payment not found', 404)
    const result = await initializeTransaction(req.body.email, Number(order.payment.amount), order.payment.transactionRef, `${getAppUrl()}/checkout?orderId=${order.id}&guest=1&email=${encodeURIComponent(req.body.email)}`)
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
      const paymentUpdate = await tx.payment.updateMany({
        where: { id: order.payment!.id, status: { not: 'PAID' } },
        data: { status: 'PAID', paidAt: new Date() },
      })
      if (paymentUpdate.count !== 1) {
        return { order: await tx.order.findUnique({ where: { id: order.id }, include: { payment: true } }), paymentUpdated: false }
      }
      return {
        order: await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' }, include: { payment: true } }),
        paymentUpdated: true,
      }
    })

    if (updated.paymentUpdated) {
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          customer: { select: { email: true, name: true, phone: true } },
          shop: { include: { owner: { select: { email: true, name: true } } } },
          items: true,
          payment: true,
        },
      })

      if (fullOrder && fullOrder.guestEmail) {
        sendOrderConfirmationEmail(fullOrder.guestEmail, {
          orderNumber: fullOrder.orderNumber,
          items: fullOrder.items.map(item => ({ name: item.name, quantity: item.quantity, price: Number(item.price) })),
          total: Number(fullOrder.total),
          deliveryMethod: fullOrder.fulfillmentMethod,
          paymentMethod: fullOrder.payment?.method || 'paystack',
          createdAt: fullOrder.createdAt.toISOString(),
          deliveryAddress: fullOrder.deliveryAddress,
          customerName: fullOrder.guestName || 'there',
          shopName: fullOrder.shop?.name,
        }).catch(err => console.error('Failed to send guest order confirmation email:', err))
      }

      const sellerEmail = fullOrder?.shop?.owner?.email
      if (sellerEmail && fullOrder) {
        sendSellerOrderNotification(sellerEmail, {
          orderNumber: fullOrder.orderNumber,
          items: fullOrder.items.map(item => ({ name: item.name, quantity: item.quantity, price: Number(item.price) })),
          buyerName: fullOrder.guestName || 'Guest',
          customerPhone: fullOrder.guestPhone || undefined,
          customerEmail: fullOrder.guestEmail || undefined,
          deliveryAddress: fullOrder.deliveryAddress,
          total: Number(fullOrder.total),
          shopName: fullOrder.shop?.name,
          deliveryMethod: fullOrder.fulfillmentMethod,
        }).catch(err => console.error('Failed to send seller notification email:', err))
      }
    }

    return successResponse(res, updated.order, 200, 'Payment verified successfully')
  } catch (error) {
    return errorResponse(res, 'Payment verification failed', 400)
  }
})

router.post('/guest', validateBody(guestCheckoutSchema), async (req: AuthenticatedRequest, res) => {
  const { items, guestName, guestPhone, guestEmail, deliveryAddress: inputDeliveryAddress, deliveryLatitude, deliveryLongitude, deliveryType, deliveryFee, notes, paymentMethod, fulfillmentMethod, promoCode } = req.body
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
  const shopGroups: Map<string, { shopId: string; sellerId: string; items: any[]; productIds: string[]; categoryIds: string[]; campus?: string | undefined; deliveryFee: number }> = new Map()

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
    let productCategoryId: string | undefined
    let productCampus: string | undefined

    if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          shop: { select: { id: true, ownerId: true, campus: true } },
          category: { select: { id: true } },
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
      productCategoryId = product.categoryId
      productCampus = product.shop?.campus || undefined
    }

    if (item.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: item.serviceId },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          shop: { select: { id: true, ownerId: true, campus: true } },
          category: { select: { id: true } },
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
      productCategoryId = service.categoryId
      productCampus = service.shop?.campus || undefined
    }

    const variant = item.variantId ? await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      select: { sku: true, name: true, attributes: true },
    }) : null

    const orderItem = {
      productId,
      serviceId,
      variantId: item.variantId || null,
      sku: variant?.sku || null,
      variantName: variant?.name || null,
      variantAttributes: variant?.attributes || null,
      quantity: item.quantity,
      price: itemPrice,
      name: itemName,
      image: itemImage,
    }

    if (!shopGroups.has(shopId)) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { deliveryAvailable: true, pickupAvailable: true, sellerDeliveryAvailable: true, platformDeliveryFee: true, sellerDeliveryFee: true } })
      const methodError = shop && deliveryMethodError(shop, deliveryType, resolvedFulfillmentMethod)
      if (methodError) return errorResponse(res, methodError, 400)
      const serverDeliveryFee = deliveryType === 'DELIVERY'
        ? Number(shop?.platformDeliveryFee || shop?.sellerDeliveryFee || 0)
        : 0
      shopGroups.set(shopId, { shopId, sellerId, items: [], productIds: [], categoryIds: productCategoryId ? [productCategoryId] : [], campus: productCampus, deliveryFee: serverDeliveryFee })
    }
    const group = shopGroups.get(shopId)!
    group.items.push(orderItem)
    if (productId) group.productIds.push(productId)
    if (productCategoryId && !group.categoryIds.includes(productCategoryId)) group.categoryIds.push(productCategoryId)
    if (productCampus && !group.campus) group.campus = productCampus
  }

  let promoValidation: PromoValidationResult | null = null
  if (promoCode) {
    const allProductIds = Array.from(new Set(Array.from(shopGroups.values()).flatMap(g => g.productIds)))
    const allCategoryIds = Array.from(new Set(Array.from(shopGroups.values()).flatMap(g => g.categoryIds)))
    const allCampuses = Array.from(new Set(Array.from(shopGroups.values()).map(g => g.campus).filter(Boolean) as string[]))
    const allShopIds = Array.from(new Set(Array.from(shopGroups.values()).map(g => g.shopId).filter(Boolean) as string[]))

    promoValidation = await validatePromoCode({
      code: promoCode,
      customerId: null,
      guestIdentifier: (req as any).headers['x-session-id'] as string | undefined,
      customerType: null,
      subtotal: Array.from(shopGroups.values()).reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.price * i.quantity, 0), 0),
      deliveryFee: Array.from(shopGroups.values()).reduce((sum, g) => sum + g.deliveryFee, 0),
      shopId: allShopIds[0] || undefined,
      productIds: allProductIds,
      categoryIds: allCategoryIds,
      campus: allCampuses[0] || undefined,
    })

    if (!promoValidation.valid) {
      return errorResponse(res, promoValidation.error || 'Invalid promo code', 400)
    }
  }

  const orders = await prisma.$transaction(async (tx) => {
    const createdOrders: any[] = []

    for (const [shopId, group] of shopGroups) {
      const itemsSubtotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      let shopTotal = itemsSubtotal + (deliveryType === 'DELIVERY' ? group.deliveryFee : 0)
      let orderOriginalSubtotal = itemsSubtotal
      let orderPromoDiscount = 0
      let orderDiscountedSubtotal = itemsSubtotal

      if (promoValidation && promoValidation.valid && promoValidation.promo && doesPromoApplyToGroup(promoValidation.promo, group)) {
        const calc = calculateDiscount({
          discountType: promoValidation.promo.discountType,
          discountValue: Number(promoValidation.promo.discountValue),
          maxDiscount: promoValidation.promo.maxDiscount ? Number(promoValidation.promo.maxDiscount) : null,
          eligibleSubtotal: itemsSubtotal,
          deliveryFee: group.deliveryFee,
          discountAppliesTo: promoValidation.promo.discountAppliesTo,
        })
        orderPromoDiscount = calc.discountAmount
        orderDiscountedSubtotal = calc.discountedSubtotal
        if (promoValidation.promo.discountAppliesTo === 'PRODUCTS_AND_DELIVERY') {
          shopTotal = orderDiscountedSubtotal + (deliveryType === 'DELIVERY' ? (group.deliveryFee - calc.deliveryDiscount) : 0)
        } else {
          shopTotal = orderDiscountedSubtotal + (deliveryType === 'DELIVERY' ? group.deliveryFee : 0)
        }
      }

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
          deliveryFee: deliveryType === 'DELIVERY' ? group.deliveryFee : 0,
          deliveryLatitude: deliveryLatitude ?? null,
          deliveryLongitude: deliveryLongitude ?? null,
          deliveryStatus: 'PENDING',
          fulfillmentMethod: resolvedFulfillmentMethod,
          notes: notes || null,
          promoCodeId: promoValidation?.valid && doesPromoApplyToGroup(promoValidation.promo, group) ? promoValidation.promo!.id : null,
          promoDiscount: orderPromoDiscount,
          originalSubtotal: orderOriginalSubtotal,
          discountedSubtotal: orderDiscountedSubtotal,
        },
      })

      for (const item of group.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId || null,
            serviceId: item.serviceId || null,
            variantId: item.variantId || null,
            sku: item.sku || null,
            variantName: item.variantName || null,
            variantAttributes: item.variantAttributes || null,
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
          description: promoValidation?.valid && orderPromoDiscount > 0
            ? `Guest order payment for ${newOrder.orderNumber} (includes ${promoValidation.promo!.discountType === 'PERCENTAGE' ? promoValidation.promo!.discountValue + '%' : 'GH₵' + promoValidation.promo!.discountValue} discount)`
            : `Guest order payment for ${newOrder.orderNumber}`,
        },
      })

      await createSellerEarnings(newOrder.id, tx)

      if (promoValidation?.valid && promoValidation.promo) {
        const commissionRate = await getPlatformCommissionRate()
        const commission = Math.round(orderOriginalSubtotal * commissionRate * 100) / 100
        const fundingSource = promoValidation.promo.fundingType

        let sellerPayout = orderDiscountedSubtotal - commission
        let pickamgoPromoExpense = 0
        let sellerFundedDiscount = 0

        if (fundingSource === 'SELLER') {
          sellerFundedDiscount = orderPromoDiscount
          sellerPayout = orderDiscountedSubtotal - commission
        } else if (fundingSource === 'PICKAMGO') {
          pickamgoPromoExpense = orderPromoDiscount
          sellerPayout = orderOriginalSubtotal - commission
        }

        sellerPayout = Math.round(sellerPayout * 100) / 100
        pickamgoPromoExpense = Math.round(pickamgoPromoExpense * 100) / 100
        sellerFundedDiscount = Math.round(sellerFundedDiscount * 100) / 100

        await tx.promoRedemption.create({
          data: {
            promoCodeId: promoValidation.promo.id,
            orderId: newOrder.id,
            customerId: null,
            guestIdentifier: (req as any).headers['x-session-id'] as string || null,
            originalSubtotal: orderOriginalSubtotal,
            discountAmount: orderPromoDiscount,
            discountedSubtotal: orderDiscountedSubtotal,
            deliveryDiscount: promoValidation.deliveryDiscount,
            fundingSource,
            sellerPayout,
            pickamgoCommission: commission,
            pickamgoPromoExpense,
            sellerFundedDiscount,
          },
        })

        await incrementPromoUsage(promoValidation.promo.id, pickamgoPromoExpense)
      }

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

        await createRiderEarnings(newDelivery.id, tx)
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
      redemption: true,
    },
  })


  return successResponse(res, { orders: fullOrders }, 201, 'Guest orders created successfully')
})

export default router
