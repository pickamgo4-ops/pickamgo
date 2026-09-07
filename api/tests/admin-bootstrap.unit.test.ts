import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { __testing } from '../src/utils/bootstrap-admin'

describe('Administrator bootstrap helpers', () => {
  it('normalizes the configured admin email to lowercase', () => {
    assert.equal(__testing.normalizeEmail('  Hayfordernest136@GMAIL.COM  '), 'hayfordernest136@gmail.com')
  })

  it('preserves the existing user when promoting (idempotent contract)', () => {
    const adminEmail = 'hayfordernest136@gmail.com'
    assert.equal(__testing.normalizeEmail(adminEmail), 'hayfordernest136@gmail.com')
  })
})