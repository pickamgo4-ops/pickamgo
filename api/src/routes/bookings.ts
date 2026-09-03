import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendBookingConfirmationEmail, sendBookingStatusEmail } from '../services/email'
import { addDays, getCurrentMinutesInBookingTimeZone, getDateInBookingTimeZone, getDayOfWeek, isValidDateString, parseTimeSlots, parseTimeToMinutes } from '../utils/booking'

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
        service: { include: {           category: { select: { id: true, name: true, emoji: true, color: true } }, images: true } },
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
      service: { include: {           category: { select: { id: true, name: true, emoji: true, color: true } }, images: true } },
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
  orderId: z.string().min(1).optional(),
  date: z.string().refine(isValidDateString, 'Date must use YYYY-MM-DD format'),
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

  if (orderId) {
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
  }

  const today = getDateInBookingTimeZone()
  const rule = await prisma.bookingRule.findUnique({ where: { shopId: service.shopId } })
  const maxAdvanceDays = rule?.maxAdvanceBookingDays ?? service.maxAdvanceDays
  const minNoticeHours = rule?.minBookingNoticeHours ?? service.minNoticeHours
  if (date < today) return errorResponse(res, 'Cannot book in the past', 400)
  if (date > addDays(today, maxAdvanceDays)) return errorResponse(res, 'Date is too far in the future', 400)

  const availability = await prisma.serviceAvailability.findUnique({
    where: { serviceId_date: { serviceId, date } },
  })
  const availableSlots = availability?.timeSlots ? parseTimeSlots(availability.timeSlots) : []

  const assignedStaff = await prisma.staff.findMany({
    where: { shopId: service.shopId, isActive: true, services: { some: { serviceId } } },
    include: { availabilities: true },
  })
  if (assignedStaff.length > 0) {
    const dayOfWeek = getDayOfWeek(date)
    const hasStaffAvailability = assignedStaff.some(staff => {
      const schedule = staff.availabilities.find(item => item.dayOfWeek === dayOfWeek)
      if (!schedule || !schedule.isAvailable || schedule.isDayOff) return false
      const start = parseTimeToMinutes(schedule.startTime)
      const end = parseTimeToMinutes(schedule.endTime)
      const slot = parseTimeToMinutes(timeSlot)
      const breakStart = schedule.breakStart ? parseTimeToMinutes(schedule.breakStart) : null
      const breakEnd = schedule.breakEnd ? parseTimeToMinutes(schedule.breakEnd) : null
      const duration = parseInt(service.duration) || 60
      return start !== null && end !== null && slot !== null && slot >= start && slot + duration <= end &&
        (breakStart === null || breakEnd === null || slot >= breakEnd || slot + duration <= breakStart)
    })
    if (!hasStaffAvailability) return errorResponse(res, 'This time slot is not available', 409)
  } else if (!availability?.isAvailable || !availableSlots.includes(timeSlot)) {
    return errorResponse(res, 'This time slot is not available', 409)
  }

  if (date === today) {
    const slotMinutes = parseTimeToMinutes(timeSlot)
    const earliestMinutes = getCurrentMinutesInBookingTimeZone() + minNoticeHours * 60
    if (slotMinutes === null || slotMinutes < earliestMinutes) {
      return errorResponse(res, 'This time slot is no longer available', 409)
    }
  }

  if (rule?.maxBookingsPerDay) {
    const bookingsToday = await prisma.booking.count({
      where: { providerId: service.providerId, date, status: { not: 'CANCELLED' } },
    })
    if (bookingsToday >= rule.maxBookingsPerDay) return errorResponse(res, 'No more bookings are available on this date', 409)
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
        service: { include: { category: { select: { id: true, name: true, emoji: true, color: true } } } },
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

  if (isCustomer && status === 'CANCELLED') {
    const rule = await prisma.bookingRule.findUnique({ where: { shopId: booking.shopId } })
    const cancellationHours = rule?.cancellationHours ?? 24
    const today = getDateInBookingTimeZone()
    if (booking.date < today) return errorResponse(res, 'This booking can no longer be cancelled', 400)
    if (booking.date === today) {
      const bookingMinutes = parseTimeToMinutes(booking.timeSlot)
      const currentMinutes = getCurrentMinutesInBookingTimeZone()
      if (bookingMinutes !== null && currentMinutes >= bookingMinutes - cancellationHours * 60) {
        return errorResponse(res, `Bookings must be cancelled at least ${cancellationHours} hours in advance`, 400)
      }
    }
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
        service: { include: { category: { select: { id: true, name: true, emoji: true, color: true } } } },
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
