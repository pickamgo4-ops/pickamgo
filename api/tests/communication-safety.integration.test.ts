import test from 'node:test'
import assert from 'node:assert/strict'
import { containsDisallowedContactPattern, isOrderEligibleForMessaging, normalizeForModeration } from '../src/utils/moderation'

test('normalizes disguised contact attempts for moderation', () => {
  assert.equal(normalizeForModeration('W h a t s A p p: 024-123-4567').includes('whatsapp'), true)
  assert.equal(normalizeForModeration('Pay me directly on MoMo 0551234567').includes('momo'), true)
})

test('detects disallowed outside-platform contact and payment requests', () => {
  assert.equal(containsDisallowedContactPattern('WhatsApp me on 0241234567'), true)
  assert.equal(containsDisallowedContactPattern('Send the money to my MoMo account 0551234567'), true)
  assert.equal(containsDisallowedContactPattern('Please contact support through PickAmGo.'), false)
})

test('order messaging eligibility only works for active paid orders', () => {
  assert.equal(isOrderEligibleForMessaging({ status: 'PAID', customerId: 'c1', sellerId: 's1', riderId: null, payment: { status: 'PAID' } } as any), true)
  assert.equal(isOrderEligibleForMessaging({ status: 'DELIVERED', customerId: 'c1', sellerId: 's1', riderId: null, payment: { status: 'PAID' } } as any), false)
  assert.equal(isOrderEligibleForMessaging({ status: 'CANCELLED', customerId: 'c1', sellerId: 's1', riderId: null, payment: { status: 'PAID' } } as any), false)
})
