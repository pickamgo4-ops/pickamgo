import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { requireRole } from '../src/middleware/auth'
import type { AuthenticatedRequest } from '../src/middleware/auth'

function runRequireRole(user: unknown) {
  return new Promise<{ statusCode: number; body: any }>(resolve => {
    const req = { user } as AuthenticatedRequest
    const res: any = {
      statusCode: 200,
      body: null,
      status(code: number) { this.statusCode = code; return this },
      json(payload: unknown) { this.body = payload; return this },
    }
    let nextCalled = false
    requireRole(['ADMIN'])(req, res, () => { nextCalled = true })
    resolve({ statusCode: res.statusCode, body: res.body, nextCalled })
  })
}

describe('Admin authorization (requireRole middleware)', () => {
  it('rejects unauthenticated requests', async () => {
    const result = await runRequireRole(undefined)
    assert.equal(result.statusCode, 401)
    assert.equal(result.body.success, false)
    assert.equal(result.body.error, 'Authentication required')
  })

  it('rejects sellers from admin endpoints', async () => {
    const result = await runRequireRole({ isAdmin: false, isSeller: true, isRider: false })
    assert.equal(result.statusCode, 403)
    assert.equal(result.body.success, false)
    assert.equal(result.body.error, 'Insufficient permissions')
  })

  it('rejects riders from admin endpoints', async () => {
    const result = await runRequireRole({ isAdmin: false, isSeller: false, isRider: true })
    assert.equal(result.statusCode, 403)
    assert.equal(result.body.success, false)
  })

  it('rejects normal users from admin endpoints', async () => {
    const result = await runRequireRole({ isAdmin: false, isSeller: false, isRider: false })
    assert.equal(result.statusCode, 403)
    assert.equal(result.body.success, false)
  })

  it('allows admins through admin-only routes', async () => {
    let nextCalled = false
    const req = { user: { isAdmin: true, isSeller: false, isRider: false } } as AuthenticatedRequest
    const res: any = {
      statusCode: 200,
      body: null,
      status(code: number) { this.statusCode = code; return this },
      json(payload: unknown) { this.body = payload; return this },
    }
    requireRole(['ADMIN'])(req, res, () => { nextCalled = true })
    assert.equal(nextCalled, true)
  })

  it('a user with only ADMIN cannot satisfy other roles', async () => {
    const result = await runRequireRole({ isAdmin: true, isSeller: false, isRider: false })
    assert.equal(result.statusCode, 200)
    assert.equal(result.nextCalled, true)
  })
})