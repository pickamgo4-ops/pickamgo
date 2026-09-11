import test from 'node:test'
import assert from 'node:assert/strict'
import { allocateCollaborationRefund, allocateProportionally, assertCollaborationActive } from '../src/services/collaborations'

test('allocates bundle discount proportionally and preserves every cent', () => {
  const allocation = allocateProportionally(450, [{ key: 'shop-a', baseCents: 30000 }, { key: 'shop-b', baseCents: 20000 }])
  assert.equal(allocation.get('shop-a'), 27000)
  assert.equal(allocation.get('shop-b'), 18000)
  assert.equal(Array.from(allocation.values()).reduce((sum, value) => sum + value, 0), 45000)
})

test('assigns rounding remainder deterministically to the final line', () => {
  const allocation = allocateProportionally(10, [{ key: 'a', baseCents: 1 }, { key: 'b', baseCents: 1 }, { key: 'c', baseCents: 1 }])
  assert.deepEqual(Array.from(allocation.values()), [333, 333, 334])
})

test('only active, in-window collaborations can be purchased', () => {
  assert.doesNotThrow(() => assertCollaborationActive({ status: 'ACTIVE', startsAt: null, endsAt: null }))
  assert.throws(() => assertCollaborationActive({ status: 'PAUSED', startsAt: null, endsAt: null }), /not active/)
  assert.throws(() => assertCollaborationActive({ status: 'ACTIVE', startsAt: new Date(Date.now() + 60_000), endsAt: null }), /not started/)
  assert.throws(() => assertCollaborationActive({ status: 'ACTIVE', startsAt: null, endsAt: new Date(Date.now() - 60_000) }), /expired/)
})

test('allocates a partial refund across remaining shop allocations without losing cents', () => {
  const targets = allocateCollaborationRefund(100, [
    { id: 'a', grossAmount: 270, refundedAmount: 0, netAmount: 250, platformFee: 20 },
    { id: 'b', grossAmount: 180, refundedAmount: 0, netAmount: 165, platformFee: 15 },
  ])
  assert.equal(targets.reduce((sum, target) => sum + target.amountCents, 0), 10000)
  assert.equal(targets.reduce((sum, target) => sum + target.sellerPayoutReversalCents + target.platformFeeReversalCents, 0), 10000)
})

test('rejects a duplicate refund beyond the remaining allocation capacity', () => {
  assert.throws(() => allocateCollaborationRefund(1, [{ id: 'a', grossAmount: 100, refundedAmount: 100, netAmount: 90, platformFee: 10 }]), /remaining collaboration allocation/)
})
