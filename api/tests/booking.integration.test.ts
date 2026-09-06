import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import crypto from 'node:crypto'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import bcrypt from 'bcrypt'
import prisma from '../src/utils/prisma'
import { generateToken } from '../src/middleware/auth'
import { addDays, getDayOfWeek, getDateInBookingTimeZone } from '../src/utils/booking'

const apiDirectory = path.resolve(__dirname, '..')
const port = 46000 + Math.floor(Math.random() * 1000)
const testRun = crypto.randomUUID()
const createdUserIds: string[] = []
const createdShopIds: string[] = []
const createdCategoryIds: string[] = []
let server: ChildProcess

async function request(pathname: string, init: RequestInit = {}) {
  return fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request('/health')
      if (response.ok) return
    } catch {
      // The child process is still starting.
    }
    await delay(250)
  }
  throw new Error('API did not start')
}

async function createUser(name: string, isSeller: boolean) {
  const user = await prisma.user.create({
    data: {
      email: `booking-${testRun}-${createdUserIds.length}@example.com`,
      name,
      passwordHash: await bcrypt.hash('CorrectPassword1!', 10),
      location: 'Accra',
      isSeller,
      emailVerified: true,
    },
  })
  createdUserIds.push(user.id)
  return user
}

function authHeaders(user: { id: string; email: string; name: string; isSeller: boolean; isRider: boolean; isAdmin: boolean; authVersion: number }) {
  return { authorization: `Bearer ${generateToken(user as any)}` }
}

async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

function nextDate(dayOfWeek: number) {
  let date = getDateInBookingTimeZone()
  for (let index = 0; index < 8; index += 1) {
    if (getDayOfWeek(date) === dayOfWeek) return date
    date = addDays(date, 1)
  }
  throw new Error('Could not find requested weekday')
}

before(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for integration tests')
  server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'], {
    cwd: apiDirectory,
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port) },
    stdio: 'ignore',
  })
  await waitForServer()
})

after(async () => {
  if (server.pid) {
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' })
    else server.kill('SIGTERM')
  }
  if (createdShopIds.length) await prisma.shop.deleteMany({ where: { id: { in: createdShopIds } } })
  if (createdCategoryIds.length) await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } })
  if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
})

describe('booking lifecycle integration', { concurrency: false }, () => {
  it('moves through setup, live booking, conflict protection, disable, and re-enable', async () => {
    const seller = await createUser('Booking Seller', true)
    const customer = await createUser('Booking Customer', false)
    const shop = await prisma.shop.create({
      data: {
        ownerId: seller.id,
        name: `Booking Shop ${testRun}`,
        slug: `booking-shop-${testRun}`,
        logo: '',
        description: 'Controlled booking integration shop',
        location: 'Accra',
        openingHours: '09:00-17:00',
        status: 'ACTIVE',
        isBookingEnabled: false,
      },
    })
    createdShopIds.push(shop.id)
    const category = await prisma.category.create({ data: { name: `Booking Category ${testRun}`, slug: `booking-category-${testRun}`, emoji: 'B', color: '#000000' } })
    createdCategoryIds.push(category.id)
    const sellerHeaders = authHeaders(seller)
    const customerHeaders = authHeaders(customer)

    let response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    let body = await json<any>(response)
    assert.equal(response.status, 200)
    assert.equal(body.data.status, 'NOT_CONFIGURED')

    response = await request('/api/booking-setup/enable', { method: 'POST', headers: sellerHeaders, body: '{}' })
    body = await json<any>(response)
    assert.equal(response.status, 409)
    assert.match(body.error, /complete your setup/i)

    const service = await prisma.service.create({
      data: {
        shopId: shop.id,
        providerId: seller.id,
        categoryId: category.id,
        name: 'Integration haircut',
        description: 'A real configured service',
        price: 50,
        duration: '60',
        bufferMinutes: 15,
        staffRequired: true,
        allowStaffSelection: true,
        location: 'Accra',
        status: 'ACTIVE',
      },
    })
    await prisma.bookingRule.create({
      data: {
        shopId: shop.id,
        allowStaffSelection: true,
        autoConfirm: true,
        minBookingNoticeHours: 2,
        maxAdvanceBookingDays: 30,
        bufferTimeMinutes: 15,
      },
    })

    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'ALMOST_READY')
    assert.equal(body.data.checks.services, true)
    assert.equal(body.data.checks.staff, false)

    const firstStaff = await prisma.staff.create({ data: { shopId: shop.id, name: 'Available Staff', role: 'Barber', isActive: true } })
    const secondStaff = await prisma.staff.create({ data: { shopId: shop.id, name: 'Backup Staff', role: 'Barber', isActive: true } })
    await prisma.staffService.createMany({ data: [firstStaff, secondStaff].map(staff => ({ staffId: staff.id, serviceId: service.id })) })

    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'ALMOST_READY')
    assert.equal(body.data.checks.staff, true)
    assert.equal(body.data.checks.availability, false)

    const monday = nextDate(1)
    const tuesday = addDays(monday, 1)
    await prisma.staffAvailability.createMany({
      data: [
        { staffId: firstStaff.id, dayOfWeek: 1, startTime: '09:00', endTime: '16:00', breakStart: '11:00', breakEnd: '12:00', isAvailable: true, isDayOff: false },
        { staffId: secondStaff.id, dayOfWeek: 1, startTime: '09:00', endTime: '16:00', breakStart: '11:00', breakEnd: '12:00', isAvailable: true, isDayOff: false },
        { staffId: firstStaff.id, dayOfWeek: 2, startTime: '09:00', endTime: '16:00', isAvailable: false, isDayOff: true },
        { staffId: secondStaff.id, dayOfWeek: 2, startTime: '09:00', endTime: '16:00', isAvailable: true, isDayOff: false },
      ],
    })
    const slots = JSON.stringify(['9:00 AM', '10:15 AM', '12:45 PM', '2:00 PM'])
    await prisma.serviceAvailability.createMany({
      data: [
        { serviceId: service.id, date: monday, timeSlots: slots, isAvailable: true },
        { serviceId: service.id, date: tuesday, timeSlots: slots, isAvailable: true },
      ],
    })

    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'READY')
    assert.equal(body.data.configured, true)

    response = await request('/api/booking-setup/enable', { method: 'POST', headers: sellerHeaders, body: '{}' })
    body = await json<any>(response)
    assert.equal(response.status, 200)
    assert.equal(body.data.status, 'LIVE')
    assert.equal((await prisma.shop.findUnique({ where: { id: shop.id } }))?.isBookingEnabled, true)

    response = await request('/api/services?limit=100')
    body = await json<any>(response)
    assert.ok(body.data.services.some((item: any) => item.id === service.id))

    response = await request(`/api/booking-setup/available-slots?serviceId=${service.id}&date=${monday}`)
    body = await json<any>(response)
    assert.equal(response.status, 200)
    assert.ok(body.data.slots.includes('9:00 AM'))
    assert.ok(body.data.slots.includes('12:45 PM'))
    assert.ok(!body.data.slots.includes('10:15 AM'))
    assert.ok(body.data.staff.some((item: any) => item.id === firstStaff.id))
    assert.ok(body.data.staff.some((item: any) => item.id === secondStaff.id))

    response = await request(`/api/booking-setup/available-slots?serviceId=${service.id}&date=${addDays(monday, 6)}`)
    body = await json<any>(response)
    assert.deepEqual(body.data.slots, [])

    response = await request(`/api/booking-setup/available-slots?serviceId=${service.id}&date=${addDays(getDateInBookingTimeZone(), 31)}`)
    assert.equal(response.status, 400)

    response = await request('/api/bookings', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({ serviceId: service.id, date: monday, timeSlot: '9:00 AM' }),
    })
    body = await json<any>(response)
    assert.equal(response.status, 201)
    const bookingId = body.data.id
    assert.equal(body.data.shopId, shop.id)
    assert.equal(body.data.serviceId, service.id)
    assert.equal(body.data.staffId, firstStaff.id)
    assert.equal(body.data.date, monday)
    assert.equal(body.data.timeSlot, '9:00 AM')

    response = await request(`/api/booking-setup/available-slots?serviceId=${service.id}&date=${monday}`)
    body = await json<any>(response)
    assert.ok(body.data.slots.includes('9:00 AM'))
    assert.ok(!body.data.staff.find((item: any) => item.id === firstStaff.id).availableSlots.includes('9:00 AM'))
    assert.ok(body.data.staff.find((item: any) => item.id === secondStaff.id).availableSlots.includes('9:00 AM'))

    response = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders(await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })),
      body: JSON.stringify({ serviceId: service.id, date: monday, timeSlot: '9:30 AM' }),
    })
    body = await json<any>(response)
    assert.equal(response.status, 409)
    assert.match(body.error, /no longer available/i)

    response = await request('/api/seller/bookings', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.ok(body.data.bookings.some((item: any) => item.id === bookingId))

    await prisma.bookingRule.update({ where: { shopId: shop.id }, data: { allowStaffSelection: false } })
    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'LIVE')

    response = await request('/api/bookings', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({ serviceId: service.id, date: tuesday, timeSlot: '9:00 AM' }),
    })
    body = await json<any>(response)
    assert.equal(response.status, 201)
    assert.equal(body.data.staffId, secondStaff.id)

    await prisma.service.update({ where: { id: service.id }, data: { status: 'INACTIVE' } })
    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'ALMOST_READY')
    await prisma.service.update({ where: { id: service.id }, data: { status: 'ACTIVE' } })

    response = await request('/api/booking-setup/disable', { method: 'POST', headers: sellerHeaders, body: '{}' })
    assert.equal(response.status, 200)
    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'READY')
    assert.equal((await prisma.booking.findUnique({ where: { id: bookingId } }))?.status, 'PENDING')
    assert.ok(await prisma.service.findUnique({ where: { id: service.id } }))
    assert.ok(await prisma.staff.findUnique({ where: { id: firstStaff.id } }))
    assert.ok(await prisma.bookingRule.findUnique({ where: { shopId: shop.id } }))

    response = await request('/api/bookings', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({ serviceId: service.id, date: tuesday, timeSlot: '12:45 PM' }),
    })
    assert.equal(response.status, 409)

    response = await request('/api/booking-setup/enable', { method: 'POST', headers: sellerHeaders, body: '{}' })
    assert.equal(response.status, 200)
    response = await request('/api/booking-setup/status', { headers: sellerHeaders })
    body = await json<any>(response)
    assert.equal(body.data.status, 'LIVE')

    response = await request('/api/bookings', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({ serviceId: service.id, date: tuesday, timeSlot: '12:45 PM' }),
    })
    assert.equal(response.status, 201)
  })

  it('enforces seller isolation for booking setup resources', async () => {
    const sellerA = await createUser('Seller A', true)
    const sellerB = await createUser('Seller B', true)
    const shopB = await prisma.shop.create({
      data: {
        ownerId: sellerB.id,
        name: `Other Shop ${testRun}`,
        slug: `other-shop-${testRun}`,
        logo: '',
        description: 'Other controlled shop',
        location: 'Accra',
        openingHours: '09:00-17:00',
        status: 'ACTIVE',
      },
    })
    createdShopIds.push(shopB.id)
    const staffB = await prisma.staff.create({ data: { shopId: shopB.id, name: 'Other Staff', role: 'Barber' } })
    const tokenA = authHeaders(sellerA)

    let response = await request('/api/booking-setup/staff', { headers: tokenA })
    let body = await json<any>(response)
    assert.equal(response.status, 404)
    assert.match(body.error, /shop not found/i)

    response = await request(`/api/booking-setup/staff/${staffB.id}/availability`, { headers: tokenA })
    assert.equal(response.status, 404)
    response = await request(`/api/booking-setup/staff/${staffB.id}/services`, { headers: tokenA })
    assert.equal(response.status, 404)
    response = await request('/api/booking-setup/status', { headers: tokenA })
    body = await json<any>(response)
    assert.equal(response.status, 404)

    await prisma.shop.update({ where: { id: shopB.id }, data: { isBookingEnabled: true } })
    response = await request('/api/booking-setup/disable', { method: 'POST', headers: tokenA, body: '{}' })
    assert.equal(response.status, 404)
    assert.equal((await prisma.shop.findUnique({ where: { id: shopB.id } }))?.isBookingEnabled, true)
  })
})
