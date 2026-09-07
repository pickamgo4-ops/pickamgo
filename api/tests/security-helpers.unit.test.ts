import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeEvidenceStatus, canAccessOrderEvidence, isSafeEvidenceUrl } from '../src/utils/orderSecurity'
import { identitySimilarity, normalizeIdentityName, isPayoutBeneficiaryVerified, isPayoutChangeCooldownActive } from '../src/utils/identitySecurity'
import { hashToken } from '../src/utils/sessions'

describe('Evidence security helpers', () => {
  it('normalises evidence status values', () => {
    assert.equal(normalizeEvidenceStatus('verified'), 'APPROVED')
    assert.equal(normalizeEvidenceStatus('REJECTED'), 'REJECTED')
    assert.equal(normalizeEvidenceStatus('needs_more_information'), 'NEEDS_MORE_INFO')
    assert.equal(normalizeEvidenceStatus(undefined), 'PENDING')
  })

  it('blocks evidence access for unrelated users', () => {
    const order = { customerId: 'cust', sellerId: 'seller', riderId: 'rider' }
    assert.equal(canAccessOrderEvidence(order, 'someone-else', false), false)
    assert.equal(canAccessOrderEvidence(order, 'cust', false), true)
    assert.equal(canAccessOrderEvidence(order, 'seller', false), true)
    assert.equal(canAccessOrderEvidence(order, 'rider', false), true)
    assert.equal(canAccessOrderEvidence(order, 'anyone', true), true)
  })

  it('only accepts evidence URLs from trusted storage paths', () => {
    assert.equal(isSafeEvidenceUrl('/uploads/foo.png'), true)
    assert.equal(isSafeEvidenceUrl('https://evil.com/uploads/foo.png'), false)
    assert.equal(isSafeEvidenceUrl('../etc/passwd'), false)
  })
})

describe('Identity helpers', () => {
  it('normalizes identity names case-insensitively', () => {
    assert.equal(normalizeIdentityName('John A. Doe'), 'johnadoe')
  })

  it('detects high identity similarity', () => {
    assert.ok(identitySimilarity('PickAmGo Official', 'pickamgoofficial') > 0.9)
  })

  it('verifies payout beneficiaries with matching phone and name', () => {
    const verified = isPayoutBeneficiaryVerified({
      userName: 'Kwame Mensah',
      beneficiaryName: 'Kwame Mensah',
      registeredPhone: '+233241234567',
      payoutPhone: '+233241234567',
      phoneVerified: true,
    })
    assert.equal(verified, true)
  })

  it('rejects payouts when phone does not match registered account', () => {
    const verified = isPayoutBeneficiaryVerified({
      userName: 'Kwame Mensah',
      beneficiaryName: 'Kwame Mensah',
      registeredPhone: '+233241234567',
      payoutPhone: '+233249999999',
      phoneVerified: true,
    })
    assert.equal(verified, false)
  })

  it('enforces 24-hour cooldown on payout method changes', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000)
    assert.equal(isPayoutChangeCooldownActive(recent), true)
    assert.equal(isPayoutChangeCooldownActive(new Date(Date.now() - 48 * 60 * 60 * 1000)), false)
    assert.equal(isPayoutChangeCooldownActive(null), false)
  })
})

describe('Session token hashing', () => {
  it('produces deterministic SHA-256 hashes for sessions', () => {
    const token = 'abc123'
    assert.equal(hashToken(token), hashToken(token))
    assert.notEqual(hashToken(token), hashToken(`${token}x`))
  })
})