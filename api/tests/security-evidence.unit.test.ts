import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessOrderEvidence, isSafeEvidenceUrl, normalizeEvidenceStatus } from '../src/utils/orderSecurity'

test('order evidence access is restricted to the order participants or admins', () => {
  const order = { customerId: 'c1', sellerId: 's1', riderId: 'r1' }

  assert.equal(canAccessOrderEvidence(order as any, 'c1', false), true)
  assert.equal(canAccessOrderEvidence(order as any, 's1', false), true)
  assert.equal(canAccessOrderEvidence(order as any, 'r1', false), true)
  assert.equal(canAccessOrderEvidence(order as any, 'u9', false), false)
  assert.equal(canAccessOrderEvidence(order as any, 'u9', true), true)
})

test('evidence review status values normalize to the supported workflow', () => {
  assert.equal(normalizeEvidenceStatus('approved'), 'APPROVED')
  assert.equal(normalizeEvidenceStatus('rejected'), 'REJECTED')
  assert.equal(normalizeEvidenceStatus('needs_more_info'), 'NEEDS_MORE_INFO')
  assert.equal(normalizeEvidenceStatus('pending'), 'PENDING')
  assert.equal(normalizeEvidenceStatus('unknown-status'), 'PENDING')
})

test('evidence URLs must point to PickAmGo upload storage', () => {
  process.env.R2_PUBLIC_URL = 'https://cdn.example.test'
  assert.equal(isSafeEvidenceUrl('/uploads/proof.png'), true)
  assert.equal(isSafeEvidenceUrl('https://cdn.example.test/uploads/proof.png'), true)
  assert.equal(isSafeEvidenceUrl('https://attacker.example/proof.png'), false)
  assert.equal(isSafeEvidenceUrl('/uploads/../secrets.txt'), false)
})
