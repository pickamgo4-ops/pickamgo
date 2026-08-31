import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const staffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().optional(),
  avatar: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

const staffAvailabilitySchema = z.object({
  availabilities: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    breakStart: z.string().optional(),
    breakEnd: z.string().optional(),
    isAvailable: z.boolean().default(true),
    isDayOff: z.boolean().default(false),
  })),
})

const staffServicesSchema = z.object({
  serviceIds: z.array(z.string()),
})

const bookingRuleSchema = z.object({
  autoConfirm: z.boolean().default(false),
  requireDeposit: z.boolean().default(false),
  depositAmount: z.number().optional(),
  minBookingNoticeHours: z.number().int().min(0).default(2),
  maxAdvanceBookingDays: z.number().int().min(1).default(30),
  cancellationHours: z.number().int().min(0).default(24),
  bufferTimeMinutes: z.number().int().min(0).default(0),
  allowStaffSelection: z.boolean().default(true),
  allowTimeSelection: z.boolean().default(true),
  maxBookingsPerDay: z.number().int().positive().optional(),
})

const serviceBookingConfigSchema = z.object({
  minNoticeHours: z.number().int().min(0).default(0),
  maxAdvanceDays: z.number().int().min(1).default(30),
  bufferMinutes: z.number().int().min(0).default(0),
  allowStaffSelection: z.boolean().default(true),
  requireApproval: z.boolean().default(false),
  staffRequired: z.boolean().default(false),
})

router.use(authMiddleware)

router.get('/summary', async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findFirst({
    where: { ownerId: req.user!.id },
    include: {
      _count: { select: { services: { where: { status: 'ACTIVE' } }, staff: { where: { isActive: true } } } },
      bookingRule: true,
    },
  })
  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const availableSlotsCount = await prisma.serviceAvailability.count({
    where: { service: { shopId: shop.id, status: 'ACTIVE' }, isAvailable: true },
  })

  return successResponse(res, {
    activeServices: shop._count.services,
    activeStaff: shop._count.staff,
    availableSlots: availableSlotsCount,
    bookingEnabled: !!shop.bookingRule,
  })
})

router.get('/staff', async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const staff = await prisma.staff.findMany({
    where: { shopId: shop.id },
    include: { services: { include: { service: { select: { id: true, name: true, duration: true, price: true } } } } },
    orderBy: { sortOrder: 'asc' },
  })

  return successResponse(res, staff)
})

router.post('/staff', validateBody(staffSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const data = req.body
  const staff = await prisma.staff.create({
    data: { ...data, shopId: shop.id, email: data.email || null, phone: data.phone || null },
  })

  return successResponse(res, staff, 201, 'Staff member created')
})

router.patch('/staff/:id', validateBody(staffSchema.partial()), async (req: AuthenticatedRequest, res) => {
  const staff = await prisma.staff.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
  })
  if (!staff) return errorResponse(res, 'Staff member not found', 404)

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: req.body,
  })

  return successResponse(res, updated, undefined, 'Staff member updated')
})

router.delete('/staff/:id', async (req: AuthenticatedRequest, res) => {
  const staff = await prisma.staff.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
  })
  if (!staff) return errorResponse(res, 'Staff member not found', 404)

  await prisma.staff.delete({ where: { id: staff.id } })
  return successResponse(res, null, 204, 'Staff member deleted')
})

router.get('/staff/:id/availability', async (req: AuthenticatedRequest, res) => {
  const staff = await prisma.staff.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
  })
  if (!staff) return errorResponse(res, 'Staff member not found', 404)

  const availability = await prisma.staffAvailability.findMany({
    where: { staffId: staff.id },
    orderBy: { dayOfWeek: 'asc' },
  })

  return successResponse(res, availability)
})

router.patch('/staff/:id/availability', validateBody(staffAvailabilitySchema), async (req: AuthenticatedRequest, res) => {
  const staff = await prisma.staff.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
  })
  if (!staff) return errorResponse(res, 'Staff member not found', 404)

  await prisma.$transaction(
    req.body.availabilities.map((avail: any) =>
      prisma.staffAvailability.upsert({
        where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek: avail.dayOfWeek } },
        update: avail,
        create: { ...avail, staffId: staff.id },
      })
    )
  )

  const updated = await prisma.staffAvailability.findMany({
    where: { staffId: staff.id },
    orderBy: { dayOfWeek: 'asc' },
  })

  return successResponse(res, updated, undefined, 'Availability updated')
})

router.get('/staff/:id/services', async (req: AuthenticatedRequest, res) => {
  const staff = await prisma.staff.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
    include: { services: { include: { service: true } } },
  })
  if (!staff) return errorResponse(res, 'Staff member not found', 404)

  return successResponse(res, staff.services.map(ss => ss.service))
})

router.patch('/staff/:id/services', validateBody(staffServicesSchema), async (req: AuthenticatedRequest, res) => {
  const staff = await prisma.staff.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
  })
  if (!staff) return errorResponse(res, 'Staff member not found', 404)

  const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const validServices = await prisma.service.findMany({
    where: { id: { in: req.body.serviceIds }, shopId: shop.id },
    select: { id: true },
  })
  const validIds = validServices.map(s => s.id)

  await prisma.$transaction(
    validIds.map((serviceId) =>
      prisma.staffService.upsert({
        where: { staffId_serviceId: { staffId: staff.id, serviceId } },
        update: {},
        create: { staffId: staff.id, serviceId },
      })
    )
  )

  await prisma.staffService.deleteMany({
    where: { staffId: staff.id, serviceId: { notIn: validIds } },
  })

  const updated = await prisma.staff.findUnique({
    where: { id: staff.id },
    include: { services: { include: { service: { select: { id: true, name: true, duration: true, price: true } } } } },
  })

  return successResponse(res, updated, undefined, 'Service assignments updated')
})

router.get('/rules', async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const rules = await prisma.bookingRule.findUnique({ where: { shopId: shop.id } })
  return successResponse(res, rules)
})

router.patch('/rules', validateBody(bookingRuleSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await prisma.shop.findFirst({ where: { ownerId: req.user!.id } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)

  const rules = await prisma.bookingRule.upsert({
    where: { shopId: shop.id },
    update: req.body,
    create: { ...req.body, shopId: shop.id },
  })

  return successResponse(res, rules, undefined, 'Booking rules updated')
})

router.patch('/services/:id', validateBody(serviceBookingConfigSchema), async (req: AuthenticatedRequest, res) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, shop: { ownerId: req.user!.id } },
  })
  if (!service) return errorResponse(res, 'Service not found', 404)

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: req.body,
  })

  return successResponse(res, updated, undefined, 'Service booking config updated')
})

router.get('/available-slots', async (req: AuthenticatedRequest, res) => {
  const { serviceId, date, staffId } = req.query as { serviceId: string; date: string; staffId?: string }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, status: 'ACTIVE' },
    include: { shop: true },
  })
  if (!service) return errorResponse(res, 'Service not found', 404)

  const shop = service.shop
  const rule = await prisma.bookingRule.findUnique({ where: { shopId: shop.id } })
  const minNoticeHours = rule?.minBookingNoticeHours ?? service.minNoticeHours ?? 2
  const maxAdvanceDays = rule?.maxAdvanceBookingDays ?? service.maxAdvanceDays ?? 30
  const bufferMinutes = rule?.bufferTimeMinutes ?? service.bufferMinutes ?? 0

  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (selectedDate < today) return errorResponse(res, 'Cannot book in the past', 400)

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
  if (selectedDate > maxDate) return errorResponse(res, 'Date is too far in the future', 400)

  const minBookingTime = new Date()
  minBookingTime.setHours(minBookingTime.getHours() + minNoticeHours)
  if (selectedDate.toDateString() === today.toDateString() && selectedDate < minBookingTime) {
    return errorResponse(res, 'Minimum booking notice not met', 400)
  }

  let slots: string[] = []
  let staffMembers: any[] = []

  if (staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId as string, shopId: shop.id, isActive: true },
      include: { availabilities: true },
    })
    if (!staff) return errorResponse(res, 'Staff not found', 404)

    const dayOfWeek = selectedDate.getDay()
    const avail = staff.availabilities.find(a => a.dayOfWeek === dayOfWeek)
    if (!avail || !avail.isAvailable || avail.isDayOff) {
      return successResponse(res, { slots: [], staff: [] })
    }

    slots = generateTimeSlots(avail.startTime, avail.endTime, avail.breakStart, avail.breakEnd, service.duration, bufferMinutes)

    const existingBookings = await prisma.booking.findMany({
      where: { serviceId, staffId: staff.id, date, status: { not: 'CANCELLED' } },
      select: { timeSlot: true },
    })
    const bookedSlots = new Set(existingBookings.map(b => b.timeSlot))
    slots = slots.filter(slot => !bookedSlots.has(slot))

    staffMembers = [staff]
  } else {
    const availability = await prisma.serviceAvailability.findUnique({
      where: { serviceId_date: { serviceId, date } },
    })
    if (availability?.isAvailable && availability.timeSlots) {
      slots = availability.timeSlots.split(',').map(s => s.trim()).filter(Boolean)
    }

    const allStaff = await prisma.staff.findMany({
      where: { shopId: shop.id, isActive: true },
      include: { availabilities: true },
    })

    const dayOfWeek = selectedDate.getDay()
    const availableStaff = allStaff.filter(staff => {
      const avail = staff.availabilities.find(a => a.dayOfWeek === dayOfWeek)
      return avail && avail.isAvailable && !avail.isDayOff
    })

    if (availableStaff.length > 0) {
      const existingBookings = await prisma.booking.findMany({
        where: { serviceId, date, status: { not: 'CANCELLED' } },
        select: { timeSlot: true, staffId: true },
      })

      const bookedByStaff = new Map<string, Set<string>>()
      for (const booking of existingBookings) {
        if (booking.staffId) {
          if (!bookedByStaff.has(booking.staffId)) bookedByStaff.set(booking.staffId, new Set())
          bookedByStaff.get(booking.staffId)!.add(booking.timeSlot)
        }
      }

      staffMembers = availableStaff.map(staff => ({
        id: staff.id,
        name: staff.name,
        role: staff.role,
        avatar: staff.avatar,
        availableSlots: slots.filter(slot => !(bookedByStaff.get(staff.id)?.has(slot))),
      }))
    }
  }

  return successResponse(res, { slots, staff: staffMembers })
})

function generateTimeSlots(startTime: string, endTime: string, breakStart?: string, breakEnd?: string, duration = '60', buffer = 0): string[] {
  const slots: string[] = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  const durationMinutes = parseInt(duration) || 60
  const bufferMinutes = buffer || 0

  let current = startHour * 60 + startMin
  const end = endHour * 60 + endMin

  let breakStartMin = -1
  let breakEndMin = -1
  if (breakStart && breakEnd) {
    const [bsH, bsM] = breakStart.split(':').map(Number)
    const [beH, beM] = breakEnd.split(':').map(Number)
    breakStartMin = bsH * 60 + bsM
    breakEndMin = beH * 60 + beM
  }

  while (current + durationMinutes + bufferMinutes <= end) {
    const slotEnd = current + durationMinutes
    const slotStart = current

    if (breakStartMin >= 0 && breakEndMin >= 0) {
      if (slotStart < breakEndMin && slotEnd > breakStartMin) {
        current += durationMinutes + bufferMinutes
        continue
      }
    }

    const h = Math.floor(current / 60)
    const m = current % 60
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    slots.push(`${displayHour}:${m.toString().padStart(2, '0')} ${period}`)

    current += durationMinutes + bufferMinutes
  }

  return slots
}

export default router
