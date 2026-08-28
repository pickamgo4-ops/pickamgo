import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendBookingConfirmationEmail, sendBookingStatusEmail } from '../services/email'

const router = Router()

const bookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
})

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20

  const where: any = {
    OR: [
      { customerId: req.user!.id },
      { providerId: req.user!.id },
    ],
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        service: { include: { category: true, images: true } },
        customer: { select: { id: true, name: true, avatar: true } },
        provider: { select: { id: true, name: true, avatar: true } },
        shop: { include: { owner: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ])

  return successResponse(res, {
    bookings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      service: { include: { category: true, images: true } },
      customer: { select: { id: true, name: true, avatar: true } },
      provider: { select: { id: true, name: true, avatar: true } },
      shop: true,
    },
  })

  if (!booking) return errorResponse(res, 'Booking not found', 404)

  const isAuthorized = req.user!.isAdmin ||
    booking.customerId === req.user!.id ||
    booking.providerId === req.user!.id

  if (!isAuthorized) return errorResponse(res, 'Not authorized to view this booking', 403)

  return successResponse(res, booking)
})

const createBookingSchema = z.object({
  serviceId: z.string(),
  orderId: z.string().min(1, 'A paid order is required'),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  notes: z.string().optional(),
})

router.post('/', authMiddleware, validateBody(createBookingSchema), async (req: AuthenticatedRequest, res) => {
  const { serviceId, orderId, date, timeSlot, notes } = req.body

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { shop: true },
  })

  if (!service || service.status !== 'ACTIVE') {
    return errorResponse(res, 'Service not found or not available', 404)
  }

  const paidOrder = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: req.user!.id,
      status: 'PAID',
      payment: { is: { status: 'PAID' } },
      items: { some: { serviceId } },
    },
  })
  if (!paidOrder) return errorResponse(res, 'A verified payment for this service is required', 402)

  const availability = await prisma.serviceAvailability.findUnique({
    where: { serviceId_date: { serviceId, date } },
  })
  const availableSlots = availability?.timeSlots.split(',').map(slot => slot.trim()) || []
  if (!availability?.isAvailable || !availableSlots.includes(timeSlot)) {
    return errorResponse(res, 'This time slot is not available', 409)
  }

  const existingBooking = await prisma.booking.findFirst({
    where: {
      serviceId,
      providerId: service.providerId,
      date,
      timeSlot,
      status: { not: 'CANCELLED' },
    },
  })

  if (existingBooking) {
    return errorResponse(res, 'This time slot is no longer available', 409)
  }

  let booking
  try {
    booking = await prisma.booking.create({
      data: {
        serviceId,
        customerId: req.user!.id,
        providerId: service.providerId,
        shopId: service.shopId,
        date,
        timeSlot,
        notes,
        status: 'PENDING',
      },
      include: {
        service: { include: { category: true } },
        customer: { select: { id: true, name: true, email: true, avatar: true } },
        provider: { select: { id: true, name: true, avatar: true } },
        shop: true,
      },
    })
  } catch (error: any) {
    if (error?.code === 'P2002') return errorResponse(res, 'This time slot is no longer available', 409)
    return errorResponse(res, 'Failed to create booking', 500)
  }

  await prisma.notification.create({
    data: {
      userId: service.providerId,
      type: 'NEW_BOOKING',
      title: 'New Booking',
      message: `You have a new booking for ${service.name} on ${date} at ${timeSlot}`,
      data: JSON.stringify({ bookingId: booking.id }),
    },
  })

  if (booking.customer?.email) {
    sendBookingConfirmationEmail(booking.customer.email, {
      bookingNumber: booking.id.slice(-8).toUpperCase(),
      serviceName: service.name,
      date: new Date(date).toLocaleDateString(),
      time: timeSlot,
      providerName: booking.provider?.name || 'Provider',
      location: service.shop?.name,
    }).catch(err => console.error('Failed to send booking confirmation email:', err))
  }

  return successResponse(res, booking, 201, 'Booking created successfully')
})

router.patch('/:id/status', authMiddleware, validateBody(bookingStatusSchema), async (req: AuthenticatedRequest, res) => {
  const { status } = req.body

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
  if (!booking) return errorResponse(res, 'Booking not found', 404)

  const isProvider = booking.providerId === req.user!.id
  const isCustomer = booking.customerId === req.user!.id

  if (!isProvider && !isCustomer && !req.user!.isAdmin) {
    return errorResponse(res, 'Not authorized to update this booking', 403)
  }

  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  }

  const allowed = validTransitions[booking.status] || []
  if (!allowed.includes(status)) {
    return errorResponse(res, `Cannot change status from ${booking.status} to ${status}`, 400)
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status, updatedAt: new Date() },
      include: {
        service: { include: { category: true } },
        customer: { select: { id: true, name: true, email: true, avatar: true } },
        provider: { select: { id: true, name: true, email: true, avatar: true } },
        shop: true,
      },
  })

  const notifyUserId = status === 'CANCELLED' ? booking.providerId : booking.customerId
  await prisma.notification.create({
    data: {
      userId: notifyUserId,
      type: status === 'CANCELLED' ? 'BOOKING_CANCELLED' : 'BOOKING_CONFIRMED',
      title: 'Booking Update',
      message: `Booking for ${updated.service?.name || 'service'} on ${booking.date} at ${booking.timeSlot} is now ${status.toLowerCase()}`,
      data: JSON.stringify({ bookingId: booking.id, status }),
    },
  })

  if (status === 'CANCELLED') {
    if (updated.customer?.email) {
      sendBookingStatusEmail(updated.customer.email, {
        bookingNumber: booking.id.slice(-8).toUpperCase(),
        serviceName: updated.service?.name || 'Service',
        status: 'CANCELLED',
        date: booking.date,
        time: booking.timeSlot,
      }).catch(err => console.error('Failed to send booking cancelled email:', err))
    }
  } else if (status === 'CONFIRMED' || status === 'COMPLETED') {
    const target = status === 'CONFIRMED' ? updated.customer : updated.provider
    if (target?.email) {
      sendBookingStatusEmail(target.email, {
        bookingNumber: booking.id.slice(-8).toUpperCase(),
        serviceName: updated.service?.name || 'Service',
        status,
        date: booking.date,
        time: booking.timeSlot,
      }).catch(err => console.error('Failed to send booking status email:', err))
    }
  }

  return successResponse(res, updated, undefined, 'Booking updated successfully')
})

export default router
