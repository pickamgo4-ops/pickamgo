import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendRiderNotification } from '../services/email'

const router = Router()

const deliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
})

const riderVerificationSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(10),
  idNumber: z.string().min(1),
  idType: z.string().min(1),
  idFrontUrl: z.string().url(),
  idBackUrl: z.string().url().optional(),
  selfieUrl: z.string().url().optional(),
})

router.get('/verification/status', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  const verification = await prisma.sellerVerification.findFirst({ where: { userId: req.user!.id, type: 'RIDER' } })
  return successResponse(res, verification || { status: 'NOT_SUBMITTED' })
})

router.post('/verification/verify', authMiddleware, requireRole(['RIDER']), validateBody(riderVerificationSchema), async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.sellerVerification.findFirst({ where: { userId: req.user!.id, type: 'RIDER' } })
  if (existing?.status === 'PENDING') return errorResponse(res, 'Verification already pending', 400)
  if (existing?.status === 'APPROVED') return errorResponse(res, 'Already verified', 400)
  const verification = existing
    ? await prisma.sellerVerification.update({ where: { id: existing.id }, data: { ...req.body, type: 'RIDER', status: 'PENDING', rejectionReason: null, reviewedAt: null, reviewedBy: null } })
    : await prisma.sellerVerification.create({ data: { ...req.body, userId: req.user!.id, type: 'RIDER' } })
  return successResponse(res, verification, 201, 'Rider verification submitted successfully')
})

router.get('/deliveries', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } })
  if (!rider) return errorResponse(res, 'Rider profile not found', 404)

    const availableDeliveries = await prisma.order.findMany({
      where: {
        fulfillmentMethod: 'FIND_IT_NEAR_ME_RIDER',
        status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] },
        deliveryStatus: 'PENDING',
        deliveryAddress: { not: '' },
      },
    include: {
      items: { include: { product: true, service: true } },
      shop: { include: { owner: { select: { id: true, name: true, avatar: true, location: true } } } },
      customer: { select: { id: true, name: true, avatar: true, location: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  const activeDelivery = await prisma.delivery.findFirst({
    where: { riderId: req.user!.id, status: { not: 'DELIVERED' } },
    include: { order: { include: { customer: { select: { id: true, name: true, avatar: true } } } } },
  })

  return successResponse(res, {
    rider: { ...rider, user: { name: req.user!.name, email: req.user!.email } },
    availableDeliveries,
    activeDelivery,
  })
})

router.post('/deliveries/:orderId/accept', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  const rider = await prisma.rider.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!rider) return errorResponse(res, 'Rider profile not found', 404)
  if (!rider.isOnline) return errorResponse(res, 'You must be online to accept deliveries', 400)
  if (!rider.isVerified) return errorResponse(res, 'Complete Ghana Card verification before accepting deliveries', 403)

  const existingDelivery = await prisma.delivery.findFirst({
    where: { riderId: req.user!.id, status: { not: 'DELIVERED' } },
  })
  if (existingDelivery) {
    return errorResponse(res, 'You already have an active delivery', 400)
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: {
      delivery: true,
      shop: { include: { owner: { select: { id: true, name: true, email: true } } } },
      customer: { select: { id: true, name: true, email: true, location: true } },
      items: true,
    },
  })

  if (!order) return errorResponse(res, 'Order not found', 404)
  if (order.fulfillmentMethod !== 'FIND_IT_NEAR_ME_RIDER') return errorResponse(res, 'This order is not assigned to platform rider delivery', 403)
  if (order.deliveryStatus !== 'PENDING') {
    return errorResponse(res, 'Delivery already assigned', 400)
  }
  if (order.fulfillmentMethod !== 'FIND_IT_NEAR_ME_RIDER') return errorResponse(res, 'This order uses a different fulfillment method', 403)
  if (order.status !== 'PAID' && order.status !== 'CONFIRMED' && order.status !== 'PREPARING' && order.status !== 'READY_FOR_PICKUP') {
    return errorResponse(res, 'Order is not ready for delivery', 400)
  }

  const delivery = await prisma.$transaction(async (tx) => {
    const claimedOrder = await tx.order.updateMany({
      where: {
        id: order.id,
        fulfillmentMethod: 'FIND_IT_NEAR_ME_RIDER',
        deliveryStatus: 'PENDING',
        riderId: null,
      },
      data: { deliveryStatus: 'ASSIGNED', riderId: req.user!.id },
    })
    if (claimedOrder.count !== 1) {
      throw new Error('Delivery was assigned by another rider')
    }

    const newDelivery = await tx.delivery.create({
      data: {
        orderId: order.id,
        riderId: req.user!.id,
        pickupLocation: order.shop.location,
        dropoffLocation: order.deliveryAddress,
        pickupAddress: order.shop.location,
        dropoffAddress: order.deliveryAddress,
        pickupLatitude: order.shop.latitude,
        pickupLongitude: order.shop.longitude,
        dropoffLatitude: (order as any).deliveryLatitude ?? (order as any).delivery?.dropoffLatitude,
        dropoffLongitude: (order as any).deliveryLongitude ?? (order as any).delivery?.dropoffLongitude,
        status: 'ACCEPTED',
        fee: 15,
        riderEarnings: 12,
        acceptedAt: new Date(),
      },
    })

    await tx.riderEarnings.create({
      data: { deliveryId: newDelivery.id, orderId: order.id, riderId: req.user!.id, grossAmount: 15, platformFee: 3, netAmount: 12, status: 'PENDING' },
    })

    if (order.customerId) {
      await tx.notification.create({
        data: {
          userId: order.customerId,
          type: 'RIDER_ASSIGNED',
          title: 'Rider Assigned',
          message: 'A rider has been assigned to your order and is on the way',
          data: JSON.stringify({ orderId: order.id, deliveryId: newDelivery.id }),
        },
      })
    }

    return newDelivery
  })

  const riderEmail = rider.user?.email
  if (riderEmail) {
    sendRiderNotification(riderEmail, {
      orderNumber: order.orderNumber,
      pickupAddress: order.shop.location,
      deliveryAddress: order.deliveryAddress,
      customerName: order.customer?.name || 'Guest',
      customerPhone: order.customer?.location,
      items: order.items.map(i => i.name).join(', '),
    }).catch(err => console.error('Failed to send rider notification email:', err))
  }

  return successResponse(res, delivery, 201, 'Delivery accepted')
})

router.patch('/deliveries/:id/status', authMiddleware, requireRole(['RIDER']), validateBody(deliveryStatusSchema), async (req: AuthenticatedRequest, res) => {
  const { status } = req.body

  const delivery = await prisma.delivery.findFirst({
    where: { id: req.params.id, riderId: req.user!.id },
    include: { order: true },
  })

  if (!delivery) return errorResponse(res, 'Delivery not found', 404)

  const validTransitions: Record<string, string[]> = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['ARRIVED_AT_PICKUP', 'CANCELLED'],
    ARRIVED_AT_PICKUP: ['PICKED_UP'],
    PICKED_UP: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  }

  const allowed = validTransitions[delivery.status] || []
  if (!allowed.includes(status)) {
    return errorResponse(res, `Cannot change status from ${delivery.status} to ${status}`, 400)
  }

  const updateData: any = { status }
  if (status === 'PICKED_UP') updateData.pickedUpAt = new Date()
  if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date()
  }

  const updated = await prisma.$transaction(async tx => {
    const nextDelivery = await tx.delivery.update({ where: { id: req.params.id }, data: updateData })
    if (status === 'DELIVERED') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED', deliveryStatus: 'DELIVERED', payoutEligible: true } })
      if (delivery.order.customerId) await tx.notification.create({ data: { userId: delivery.order.customerId, type: 'ORDER_DELIVERED', title: 'Order Delivered', message: 'Your order has been delivered.', data: JSON.stringify({ orderId: delivery.orderId }) } })
      if (delivery.order.sellerId) await tx.notification.create({ data: { userId: delivery.order.sellerId, type: 'ORDER_DELIVERED', title: 'Order Delivered', message: `Order ${delivery.order.orderNumber} has been delivered.`, data: JSON.stringify({ orderId: delivery.orderId }) } })
    }
    return nextDelivery
  })

  if (status === 'DELIVERED') {
    await prisma.rider.update({
      where: { userId: req.user!.id },
      data: {
        deliveriesCount: { increment: 1 },
        earnings: { increment: updated.riderEarnings },
      },
    })

  }

  return successResponse(res, updated, undefined, 'Delivery status updated')
})

router.patch('/me/status', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  try {
    const { isOnline, isAvailable } = req.body
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } })
    if (!rider) return errorResponse(res, 'Rider profile not found', 404)

    const updated = await prisma.rider.update({
      where: { userId: req.user!.id },
      data: { isOnline: isOnline ?? rider.isOnline, isAvailable: isAvailable ?? rider.isAvailable },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } } },
    })

    return successResponse(res, updated, undefined, 'Rider status updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update rider status', 500)
  }
})

router.patch('/me/location', authMiddleware, requireRole(['RIDER']), validateBody(z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})), async (req: AuthenticatedRequest, res) => {
  try {
    const riderModel = prisma.rider as any
    const updated = await riderModel.update({
      where: { userId: req.user!.id },
      data: { currentLatitude: req.body.latitude, currentLongitude: req.body.longitude, locationUpdatedAt: new Date() },
      select: { currentLatitude: true, currentLongitude: true, locationUpdatedAt: true },
    })
    return successResponse(res, updated)
  } catch {
    return errorResponse(res, 'Failed to update rider location', 500)
  }
})

router.get('/me', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  const rider = await prisma.rider.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } } },
  })

  if (!rider) {
    const newRider = await prisma.rider.create({
      data: { userId: req.user!.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } } },
    })
    return successResponse(res, newRider)
  }

  return successResponse(res, rider)
})

router.get('/earnings', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } })
    if (!rider) return errorResponse(res, 'Rider profile not found', 404)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - todayStart.getDay())

    const [todayEarnings, weekEarnings, allEarnings, pendingEarnings] = await Promise.all([
      prisma.riderEarnings.findMany({
        where: { riderId: req.user!.id, status: 'AVAILABLE', availableAt: { gte: todayStart } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: req.user!.id, status: 'AVAILABLE', availableAt: { gte: weekStart } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: req.user!.id, status: { in: ['AVAILABLE', 'WITHDRAWN'] } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: req.user!.id, status: 'PENDING' },
        select: { netAmount: true },
      }),
    ])

    const todayEarningsTotal = todayEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const weekEarningsTotal = weekEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const totalEarnings = allEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const pendingEarningsTotal = pendingEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)

    return successResponse(res, {
      todayEarnings: Math.round(todayEarningsTotal * 100) / 100,
      weekEarnings: Math.round(weekEarningsTotal * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      pendingEarnings: Math.round(pendingEarningsTotal * 100) / 100,
      todayDeliveries: todayEarnings.length,
      weekDeliveries: weekEarnings.length,
      totalDeliveries: rider.deliveriesCount,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch earnings', 500)
  }
})

router.get('/deliveries/history', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where: { riderId: req.user!.id, status: { not: 'PENDING' } },
        include: { order: { include: { customer: { select: { id: true, name: true, avatar: true } }, shop: { select: { id: true, name: true, location: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.delivery.count({ where: { riderId: req.user!.id, status: { not: 'PENDING' } } }),
    ])

    return successResponse(res, {
      deliveries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch delivery history', 500)
  }
})

export default router
