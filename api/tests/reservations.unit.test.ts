import test from 'node:test'
import assert from 'node:assert/strict'
import { availableQuantity, canReserveQuantity, isReservationActive } from '../src/services/reservations'

test('available quantity subtracts active reservations', async () => {
  const client = {
    productReservation: {
      updateMany: async () => ({ count: 0 }),
      aggregate: async () => ({ _sum: { quantity: 3 } }),
    },
  }
  assert.equal(await availableQuantity(client, 'product-1', 10), 7)
})

test('expired and cancelled reservations are not active', () => {
  const now = new Date('2026-09-10T12:00:00.000Z')
  assert.equal(isReservationActive('ACTIVE', new Date('2026-09-10T12:01:00.000Z'), now), true)
  assert.equal(isReservationActive('ACTIVE', new Date('2026-09-10T12:00:00.000Z'), now), false)
  assert.equal(isReservationActive('EXPIRED', new Date('2026-09-10T12:01:00.000Z'), now), false)
  assert.equal(isReservationActive('CANCELLED', new Date('2026-09-10T12:01:00.000Z'), now), false)
})

test('reservation quantity cannot exceed unreserved stock', () => {
  assert.equal(canReserveQuantity(10, 3, 7), true)
  assert.equal(canReserveQuantity(10, 3, 8), false)
  assert.equal(canReserveQuantity(0, 0, 1), false)
})
