import test from 'node:test'
import assert from 'node:assert/strict'
import { identitySimilarity, isCurrentPayoutDisclaimer, isPayoutBeneficiaryVerified, isPayoutChangeCooldownActive, isPlatformImpersonationName, PAYOUT_DISCLAIMER_VERSION } from '../src/utils/identitySecurity'

test('payout beneficiary must match the verified account owner, not the shop name', () => {
  const base = { userName: 'Kwame Mensah', registeredPhone: '233241234567', payoutPhone: '233241234567', phoneVerified: true }
  assert.equal(isPayoutBeneficiaryVerified({ ...base, beneficiaryName: 'Kwame Mensah' }), true)
  assert.equal(isPayoutBeneficiaryVerified({ ...base, beneficiaryName: 'Kwame Fashion Hub' }), false)
  assert.equal(isPayoutBeneficiaryVerified({ ...base, payoutPhone: '233201111111', beneficiaryName: 'Kwame Mensah' }), false)
  assert.equal(isPayoutBeneficiaryVerified({ ...base, phoneVerified: false, beneficiaryName: 'Kwame Mensah' }), false)
})

test('payout disclaimer requires the current server-controlled version', () => {
  assert.equal(isCurrentPayoutDisclaimer(PAYOUT_DISCLAIMER_VERSION), true)
  assert.equal(isCurrentPayoutDisclaimer('old-version'), false)
  assert.equal(isCurrentPayoutDisclaimer(undefined), false)
})

test('identity similarity produces review signals without treating every name as a ban', () => {
  assert.equal(identitySimilarity('Nike Ghana Official', 'Nike Ghana') > 0.8, true)
  assert.equal(isPlatformImpersonationName('PickAmGo Official'), true)
  assert.equal(isPlatformImpersonationName('Kwame Fashion Hub'), false)
})

test('payout detail changes remain locked for the review cooldown window', () => {
  const now = new Date('2026-09-07T12:00:00.000Z')
  assert.equal(isPayoutChangeCooldownActive(new Date('2026-09-07T11:00:00.000Z'), now), true)
  assert.equal(isPayoutChangeCooldownActive(new Date('2026-09-06T11:00:00.000Z'), now), false)
  assert.equal(isPayoutChangeCooldownActive(undefined, now), false)
})