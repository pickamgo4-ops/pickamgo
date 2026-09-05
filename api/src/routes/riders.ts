import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendRiderNotification, sendDeliveryStatusEmail, sendDeliveryAssignmentEmail } from '../services/email'
import { normalizeGhanaPhone } from '../services/otpService'

const router = Router()

const deliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'ARRIVED_AT_CUSTOMER', 'DELIVERED', 'CANCELLED', 'FAILED']),
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
  const normalizedPhone = normalizeGhanaPhone(req.body.phoneNumber)
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { phone: true, phoneVerified: true } })
  if (!user?.phoneVerified || user.phone !== normalizedPhone) return errorResponse(res, 'Verify this phone number before submitting rider verification', 400)
  const existing = await prisma.sellerVerification.findFirst({ where: { userId: req.user!.id, type: 'RIDER' } })
  if (existing?.status === 'PENDING') return errorResponse(res, 'Verification already pending', 400)
  if (existing?.status === 'APPROVED') return errorResponse(res, 'Already verified', 400)
  const verification = existing
    ? await prisma.sellerVerification.update({ where: { id: existing.id }, data: { ...req.body, phoneNumber: normalizedPhone, type: 'RIDER', status: 'PENDING', rejectionReason: null, reviewedAt: null, reviewedBy: null } })
    : await prisma.sellerVerification.create({ data: { ...req.body, phoneNumber: normalizedPhone, userId: req.user!.id, type: 'RIDER' } })
  return successResponse(res, verification, 201, 'Rider verification submitted successfully')
})

router.get('/deliveries', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } })
  if (!rider) return errorResponse(res, 'Rider profile not found', 404)

  if (!rider.isOnline || !rider.isAvailable) {
    return successResponse(res, {
      rider: { ...rider, user: { name: req.user!.name, email: req.user!.email } },
      availableDeliveries: [],
      activeDelivery: await prisma.delivery.findFirst({ where: { riderId: req.user!.id, status: { notIn: ['DELIVERED', 'CANCELLED', 'FAILED'] } } }),
    })
  }

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
  if (!rider.isOnline || !rider.isAvailable) return errorResponse(res, 'You must be online and available to accept deliveries', 400)

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
  if (!rider.isVerified && !order.isTestOrder) return errorResponse(res, 'Complete Ghana Card verification before accepting deliveries', 403)
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

    if (!order.isTestOrder) {
      await tx.riderEarnings.create({
        data: { deliveryId: newDelivery.id, orderId: order.id, riderId: req.user!.id, grossAmount: 15, platformFee: 3, netAmount: 12, status: 'PENDING' },
      })
    }

    await tx.rider.update({ where: { userId: req.user!.id }, data: { isAvailable: false } })

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
  if (riderEmail && !order.isTestOrder) {
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
    include: {
      order: {
        include: {
          customer: { select: { id: true, name: true, email: true } },
          shop: { include: { owner: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  })

  if (!delivery) return errorResponse(res, 'Delivery not found', 404)

  const validTransitions: Record<string, string[]> = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'CANCELLED'],
    GOING_TO_PICKUP: ['ARRIVED_AT_PICKUP', 'CANCELLED'],
    ARRIVED_AT_PICKUP: ['PICKED_UP', 'GOING_TO_PICKUP'],
    PICKED_UP: ['OUT_FOR_DELIVERY', 'IN_TRANSIT'],
    OUT_FOR_DELIVERY: ['IN_TRANSIT', 'ARRIVED_AT_CUSTOMER'],
    IN_TRANSIT: ['ARRIVED_AT_CUSTOMER', 'OUT_FOR_DELIVERY'],
    ARRIVED_AT_CUSTOMER: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    FAILED: [],
  }

  const allowed = validTransitions[delivery.status] || []
  if (!allowed.includes(status)) {
    return errorResponse(res, `Cannot change status from ${delivery.status} to ${status}`, 400)
  }

  const updateData: any = { status }
  if (status === 'PICKED_UP') updateData.pickedUpAt = new Date()
  if (status === 'GOING_TO_PICKUP' || status === 'IN_TRANSIT') {
    if (!delivery.verificationCode && !delivery.order.isTestOrder) {
        updateData.verificationCode = crypto.randomInt(1000, 10000).toString()
    }
  }
  if (status === 'DELIVERED') return errorResponse(res, 'Use delivery verification to complete this delivery', 400)

  const updated = await prisma.$transaction(async tx => {
    const nextDelivery = await tx.delivery.update({ where: { id: req.params.id }, data: updateData })
    if (status === 'PICKED_UP') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { deliveryStatus: 'PICKED_UP' } })
    }
    if (status === 'OUT_FOR_DELIVERY') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'OUT_FOR_DELIVERY', deliveryStatus: 'OUT_FOR_DELIVERY' } })
    }
    if (status === 'IN_TRANSIT') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'OUT_FOR_DELIVERY', deliveryStatus: 'IN_TRANSIT' } })
    }
    if (status === 'GOING_TO_PICKUP') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { deliveryStatus: 'GOING_TO_PICKUP' } })
    }
    if (['ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_CUSTOMER', 'DELIVERED', 'CANCELLED', 'FAILED'].includes(status)) {
      await tx.order.update({ where: { id: delivery.orderId }, data: { deliveryStatus: status } })
    }
    if (status === 'DELIVERED') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED', deliveryStatus: 'DELIVERED', payoutEligible: !delivery.order.isTestOrder } })
      if (delivery.order.customerId) await tx.notification.create({ data: { userId: delivery.order.customerId, type: 'ORDER_DELIVERED', title: 'Order Delivered', message: 'Your order has been delivered.', data: JSON.stringify({ orderId: delivery.orderId }) } })
      if (delivery.order.sellerId) await tx.notification.create({ data: { userId: delivery.order.sellerId, type: 'ORDER_DELIVERED', title: 'Order Delivered', message: `Order ${delivery.order.orderNumber} has been delivered.`, data: JSON.stringify({ orderId: delivery.orderId }) } })
    }
    return nextDelivery
  })

  const customer = delivery.order.customer
  const seller = delivery.order.shop?.owner
  if (['ACCEPTED', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'ARRIVED_AT_CUSTOMER', 'DELIVERED', 'CANCELLED', 'FAILED'].includes(status)) {
    const riderName = req.user?.name || 'Your rider'
    if (customer?.email && !delivery.order.isTestOrder) {
      sendDeliveryStatusEmail(customer.email, { orderNumber: delivery.order.orderNumber, status, riderName }).catch(err => console.error('Failed to send delivery status email to customer:', err))
    }
    if (seller?.email && status !== 'CANCELLED' && !delivery.order.isTestOrder) {
      sendDeliveryStatusEmail(seller.email, { orderNumber: delivery.order.orderNumber, status, riderName }).catch(err => console.error('Failed to send delivery status email to seller:', err))
    }
  }

  if (status === 'DELIVERED' && !delivery.order.isTestOrder) {
    await prisma.rider.update({
      where: { userId: req.user!.id },
      data: {
        deliveriesCount: { increment: 1 },
        earnings: { increment: Number(delivery.riderEarnings) },
        isAvailable: true,
      },
    })

    const riderEarningsRecord = await prisma.riderEarnings.findFirst({
      where: { deliveryId: delivery.id, orderId: delivery.orderId },
      select: { id: true },
    })
    if (riderEarningsRecord) {
      await prisma.riderEarnings.update({
        where: { id: riderEarningsRecord.id },
        data: {
          status: 'AVAILABLE',
          availableAt: new Date(),
          deliveredAt: new Date(),
        },
      })
    }
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
      data: {
        isOnline: isOnline ?? rider.isOnline,
        isAvailable: isOnline === false ? false : (isAvailable ?? rider.isAvailable),
      },
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
    const statusFilter = req.query.status as string | undefined

    const where: any = { riderId: req.user!.id, status: { not: 'PENDING' } }
    if (statusFilter) where.status = statusFilter

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          order: {
            include: {
              customer: { select: { id: true, name: true, avatar: true, phone: true, location: true } },
              shop: { select: { id: true, name: true, location: true, latitude: true, longitude: true } },
              items: { include: { product: true, service: true } },
              payment: true,
            },
          },
          riderEarningsRecord: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ])

    return successResponse(res, {
      deliveries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch delivery history', 500)
  }
})

router.get('/deliveries/:id', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: {
        OR: [
          { id: req.params.id, riderId: req.user!.id },
          { orderId: req.params.id, riderId: req.user!.id },
          { orderId: req.params.id, riderId: null, status: 'PENDING' },
        ],
      },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, avatar: true, phone: true, location: true, email: true } },
            shop: { include: { owner: { select: { id: true, name: true, email: true, avatar: true, location: true } } } },
            items: { include: { product: true, service: true } },
            payment: true,
          },
        },
        riderEarningsRecord: true,
      },
    })

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404)
    }

    return successResponse(res, delivery)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch delivery', 500)
  }
})

router.get('/earnings/history', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const period = req.query.period as string | undefined
    const statusFilter = req.query.status as string | undefined

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - todayStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let dateFilter: any
    switch (period) {
      case 'today': dateFilter = { gte: todayStart }; break
      case 'week': dateFilter = { gte: weekStart }; break
      case 'month': dateFilter = { gte: monthStart }; break
      default: dateFilter = undefined
    }

    const where: any = { riderId: userId }
    if (dateFilter) where.createdAt = dateFilter
    if (statusFilter) where.status = statusFilter

    const [records, total] = await Promise.all([
      prisma.riderEarnings.findMany({
        where,
        include: {
          order: {
            select: { orderNumber: true, total: true, status: true },
          },
          delivery: {
            select: { status: true, pickupAddress: true, dropoffAddress: true, deliveredAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.riderEarnings.count({ where }),
    ])

    const [todayEarnings, weekEarnings, monthEarnings, allEarnings, pendingEarnings] = await Promise.all([
      prisma.riderEarnings.findMany({
        where: { riderId: userId, status: 'AVAILABLE', availableAt: { gte: todayStart } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: userId, status: 'AVAILABLE', availableAt: { gte: weekStart } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: userId, status: 'AVAILABLE', availableAt: { gte: monthStart } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: userId, status: { in: ['AVAILABLE', 'WITHDRAWN'] } },
        select: { netAmount: true },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: userId, status: 'PENDING' },
        select: { netAmount: true },
      }),
    ])

    const payouts = await prisma.payout.findMany({
      where: { userId, status: 'SUCCESS' },
      select: { amount: true },
    })
    const totalWithdrawn = payouts.reduce((sum, p) => sum + Number(p.amount), 0)

    const todayTotal = todayEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const weekTotal = weekEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const monthTotal = monthEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const totalEarnings = allEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)
    const pendingTotal = pendingEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0)

    return successResponse(res, {
      todayEarnings: Math.round(todayTotal * 100) / 100,
      weekEarnings: Math.round(weekTotal * 100) / 100,
      monthEarnings: Math.round(monthTotal * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      pendingEarnings: Math.round(pendingTotal * 100) / 100,
      availableBalance: Math.round((totalEarnings - totalWithdrawn - pendingTotal) * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      records: records.map(r => ({
        id: r.id,
        orderId: r.orderId,
        deliveryId: r.deliveryId,
        orderNumber: r.order?.orderNumber || '',
        grossAmount: Number(r.grossAmount),
        platformFee: Number(r.platformFee),
        netAmount: Number(r.netAmount),
        status: r.status,
        availableAt: r.availableAt,
        withdrawnAt: r.withdrawnAt,
        createdAt: r.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch earnings history', 500)
  }
})

router.post('/deliveries/:id/verify', authMiddleware, requireRole(['RIDER']), validateBody(z.object({
  verificationCode: z.string().min(1),
})), async (req: AuthenticatedRequest, res) => {
  try {
    const { verificationCode } = req.body
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderId: req.user!.id },
      include: { order: true },
    })

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404)
    }

    if (delivery.status !== 'ARRIVED_AT_CUSTOMER' && delivery.status !== 'IN_TRANSIT') {
      return errorResponse(res, 'Delivery must be at the customer location before verification', 400)
    }

    if (!delivery.verificationCode || delivery.verificationCode !== verificationCode) {
      return errorResponse(res, 'Invalid verification code', 400)
    }

    const updated = await prisma.$transaction(async tx => {
      const nextDelivery = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          verificationCode: null,
        },
      })

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: 'DELIVERED', deliveryStatus: 'DELIVERED', payoutEligible: !delivery.order.isTestOrder },
      })

      if (!delivery.order.isTestOrder) {
        const earningsRecord = await tx.riderEarnings.findFirst({
          where: { deliveryId: delivery.id, orderId: delivery.orderId },
          select: { id: true },
        })
        if (earningsRecord) {
          await tx.riderEarnings.update({
            where: { id: earningsRecord.id },
            data: { status: 'AVAILABLE', availableAt: new Date() },
          })
        }

        await tx.rider.update({
          where: { userId: req.user!.id },
          data: {
            deliveriesCount: { increment: 1 },
            earnings: { increment: Number(delivery.riderEarnings) },
            isAvailable: true,
          },
        })
      }

      if (delivery.order.customerId) {
        await tx.notification.create({
          data: {
            userId: delivery.order.customerId,
            type: 'ORDER_DELIVERED',
            title: 'Order Delivered',
            message: 'Your order has been delivered and verified.',
            data: JSON.stringify({ orderId: delivery.orderId }),
          },
        })
      }
      if (delivery.order.sellerId) {
        await tx.notification.create({
          data: {
            userId: delivery.order.sellerId,
            type: 'ORDER_DELIVERED',
            title: 'Order Delivered',
            message: `Order ${delivery.order.orderNumber} has been delivered.`,
            data: JSON.stringify({ orderId: delivery.orderId }),
          },
        })
      }

      return nextDelivery
    })

    return successResponse(res, updated, undefined, 'Delivery verified and completed successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to verify delivery', 500)
  }
})

router.post('/deliveries/:id/report', authMiddleware, requireRole(['RIDER']), validateBody(z.object({
  reason: z.string().min(1),
  description: z.string().optional(),
})), async (req: AuthenticatedRequest, res) => {
  try {
    const { reason, description } = req.body
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderId: req.user!.id },
      include: { order: true },
    })

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404)
    }

    if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(delivery.status)) {
      return errorResponse(res, 'Cannot report a problem for a completed delivery', 400)
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        category: 'DELIVERY_PROBLEM',
        targetType: 'ORDER',
        targetId: delivery.orderId,
        reason,
        description,
      },
    })

    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        type: 'SUPPORT_UPDATE',
        title: 'Problem Reported',
        message: `Your problem report for order ${delivery.order.orderNumber} has been received.`,
        data: JSON.stringify({ reportId: report.id, orderId: delivery.orderId }),
      },
    })

    return successResponse(res, { reportId: report.id, message: 'Problem reported successfully. Support will contact you shortly.' }, 201, 'Problem reported successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to report problem', 500)
  }
})

router.patch('/me/vehicle', authMiddleware, requireRole(['RIDER']), validateBody(z.object({
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
})), async (req: AuthenticatedRequest, res) => {
  try {
    const { vehicleType, vehicleNumber, licenseNumber } = req.body
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } })
    if (!rider) return errorResponse(res, 'Rider profile not found', 404)

    const updated = await prisma.rider.update({
      where: { userId: req.user!.id },
      data: {
        vehicleType: vehicleType ?? rider.vehicleType,
        vehicleNumber: vehicleNumber ?? rider.vehicleNumber,
        licenseNumber: licenseNumber ?? rider.licenseNumber,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } } },
    })

    return successResponse(res, updated, undefined, 'Vehicle information updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update vehicle information', 500)
  }
})

router.get('/dashboard', authMiddleware, requireRole(['RIDER']), async (req: AuthenticatedRequest, res) => {
  try {
    const rider = await prisma.rider.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } } },
    })
    if (!rider) return errorResponse(res, 'Rider profile not found', 404)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - todayStart.getDay())

    const [availableCount, activeDelivery, todayEarnings, weekEarnings, allEarnings, pendingEarnings] = await Promise.all([
      rider.isOnline && rider.isAvailable ? prisma.order.count({
        where: {
          fulfillmentMethod: 'FIND_IT_NEAR_ME_RIDER',
          status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] },
          deliveryStatus: 'PENDING',
          deliveryAddress: { not: '' },
        },
      }) : Promise.resolve(0),
      prisma.delivery.findFirst({
        where: { riderId: req.user!.id, status: { not: 'DELIVERED' } },
        include: { order: { include: { customer: { select: { id: true, name: true } } } } },
      }),
      prisma.riderEarnings.findMany({
        where: { riderId: req.user!.id, status: 'AVAILABLE', availableAt: { gte: todayStart } },
        select: { netAmount: true, createdAt: true },
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

    return successResponse(res, {
      rider: {
        id: rider.id,
        userId: rider.userId,
        isOnline: rider.isOnline,
        isAvailable: rider.isAvailable,
        vehicleType: rider.vehicleType,
        vehicleNumber: rider.vehicleNumber,
        isVerified: rider.isVerified,
        rating: Number(rider.rating),
        totalDeliveries: rider.deliveriesCount,
        totalEarnings: Number(rider.earnings),
        user: rider.user,
      },
      availableDeliveries: availableCount,
      activeDelivery: activeDelivery,
      todayEarnings: todayEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0),
      weekEarnings: weekEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0),
      totalEarnings: allEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0),
      pendingEarnings: pendingEarnings.reduce((sum, d) => sum + Number(d.netAmount), 0),
      todayCompleted: todayEarnings.length,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to load dashboard', 500)
  }
})

export default router
