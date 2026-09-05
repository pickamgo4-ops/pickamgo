import { Router } from 'express'
import prisma from '../utils/prisma'
import { successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/:orderNumber', async (req, res) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''
    if (!email) return errorResponse(res, 'Email and order number are required', 400)

    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: {
        items: { include: { product: true, service: true } },
        shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
        customer: { select: { email: true } },
        payment: true,
        delivery: { include: { rider: { select: { id: true, name: true, phone: true, avatar: true } } } },
        sellerEarnings: true,
        riderEarnings: true,
      },
    })

    if (!order) {
      return errorResponse(res, 'Order not found', 404)
    }

    const orderEmail = order.customer?.email || order.guestEmail || ''
    if (orderEmail.toLowerCase() !== email) {
      return errorResponse(res, 'Order not found', 404)
    }

    let timeline: any[] = []

    if (order.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER') {
      timeline = [
        { status: 'PENDING_PAYMENT', label: 'Order placed', icon: 'Package' },
        { status: 'PAID', label: 'Payment confirmed', icon: 'CheckCircle' },
        { status: 'CONFIRMED', label: 'Order confirmed', icon: 'CheckCircle' },
        { status: 'PREPARING', label: 'Seller preparing', icon: 'Clock' },
        { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', icon: 'Package' },
        { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'Truck' },

        { status: 'DELIVERED', label: 'Delivered', icon: 'CheckCircle' },
      ]
    } else if (order.fulfillmentMethod === 'SELLER_OWN_DELIVERY') {
      timeline = [
        { status: 'PENDING_PAYMENT', label: 'Order placed', icon: 'Package' },
        { status: 'PAID', label: 'Payment confirmed', icon: 'CheckCircle' },
        { status: 'CONFIRMED', label: 'Order confirmed', icon: 'CheckCircle' },
        { status: 'PREPARING', label: 'Seller preparing', icon: 'Clock' },
        { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'Truck' },
        { status: 'DELIVERED', label: 'Delivered', icon: 'CheckCircle' },
      ]
    } else {
      timeline = [
        { status: 'PENDING_PAYMENT', label: 'Order placed', icon: 'Package' },
        { status: 'PAID', label: 'Payment confirmed', icon: 'CheckCircle' },
        { status: 'CONFIRMED', label: 'Order confirmed', icon: 'CheckCircle' },
        { status: 'PREPARING', label: 'Preparing your order', icon: 'Clock' },
        { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', icon: 'Package' },
        { status: 'DELIVERED', label: 'Picked up', icon: 'CheckCircle' },
      ]
    }

    const response = {
      ...order,
      trackingStatus: order.delivery?.status === 'PICKED_UP'
        ? 'PICKED_UP'
        : order.delivery?.status === 'OUT_FOR_DELIVERY'
          ? 'OUT_FOR_DELIVERY'
          : order.status,
      timeline,
    }

    return successResponse(res, response)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch order', 500)
  }
})

export default router
