import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateOtp, hashOtp, normalizeGhanaPhone, sendArkeselSms } from '../src/services/otpService'

describe('OTP service', () => {
  it('normalizes supported Ghanaian phone formats', () => {
    assert.equal(normalizeGhanaPhone('024 123 4567'), '233241234567')
    assert.equal(normalizeGhanaPhone('+233241234567'), '233241234567')
    assert.equal(normalizeGhanaPhone('233241234567'), '233241234567')
    assert.throws(() => normalizeGhanaPhone('023241234567'), /Invalid Ghana phone number/)
  })

  it('generates numeric OTPs with the configured length and hashes them one-way', () => {
    const otp = generateOtp(6)
    assert.match(otp, /^\d{6}$/)
    assert.notEqual(hashOtp(otp), otp)
    assert.equal(hashOtp(otp), hashOtp(otp))
  })

  it('accepts a successful Arkesel response without exposing request secrets', async () => {
    process.env.ARKESEL_API_KEY = 'test-only-key'
    let request: RequestInit | undefined
    await sendArkeselSms('233241234567', 'verification message', async (_input, init) => {
      request = init
      return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    })
    assert.equal((request?.body as URLSearchParams).get('to'), '233241234567')
    assert.equal((request?.body as URLSearchParams).get('sms'), 'verification message')
  })

  it('normalizes provider errors and network failures', async () => {
    await assert.rejects(
      sendArkeselSms('233241234567', 'message', async () => new Response('Insufficient balance', { status: 200 })),
      /Unable to send verification code/,
    )
    await assert.rejects(
      sendArkeselSms('233241234567', 'message', async () => { throw new Error('network failure') }),
      /Unable to send verification code/,
    )
  })
})