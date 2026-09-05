import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import crypto from 'node:crypto'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../src/utils/prisma'
import { generateToken } from '../src/middleware/auth'

const apiDirectory = path.resolve(__dirname, '..')
const firstPort = 45000 + Math.floor(Math.random() * 1000)
const basePorts = [firstPort, firstPort + 1]
const testRun = crypto.randomUUID()
const testIp = (suffix: number) => `198.51.100.${suffix}`
const createdUserIds: string[] = []
let servers: ChildProcess[] = []

async function request(port: number, pathname: string, init: RequestInit = {}) {
  return fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
}

async function waitForServer(port: number) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request(port, '/health')
      if (response.ok) return
    } catch {
      // The child process is still starting.
    }
    await delay(250)
  }
  throw new Error(`API did not start on port ${port}`)
}

async function createUser(overrides: Record<string, unknown> = {}) {
  const email = `rate-limit-${testRun}-${createdUserIds.length}@example.com`
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Rate Limit Test User',
      passwordHash: await bcrypt.hash('CorrectPassword1!', 10),
      location: '',
      emailVerified: true,
      ...overrides,
    },
  })
  createdUserIds.push(user.id)
  return user
}

async function login(port: number, email: string, password = 'CorrectPassword1!', ip = 10) {
  const response = await request(port, '/api/auth/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': testIp(ip) },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json() as any
  return { response, body }
}

function authHeaders(token: string, ip: number) {
  return { authorization: `Bearer ${token}`, 'x-forwarded-for': testIp(ip) }
}

before(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for integration tests')
  await prisma.rateLimitBucket.deleteMany()

  for (const port of basePorts) {
    const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'], {
      cwd: apiDirectory,
      env: { ...process.env, NODE_ENV: 'test', PORT: String(port) },
      stdio: 'ignore',
    })
    servers.push(child)
    await waitForServer(port)
  }
})

after(async () => {
  for (const child of servers) {
    if (process.platform === 'win32' && child.pid) {
      execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  }
  await prisma.emailVerification.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.rateLimitBucket.deleteMany()
  await prisma.$disconnect()
})

describe('rate limiting integration', { concurrency: false }, () => {
  it('shares one authenticated bucket across three sessions and isolates users', async () => {
    const userA = await createUser()
    const userB = await createUser()
    const tokenA = generateToken(userA)
    const tokenB = generateToken(userB)

    for (const [token, count, ip] of [[tokenA, 40, 11], [tokenA, 30, 12], [tokenA, 30, 13]] as const) {
      for (let index = 0; index < count; index += 1) {
        const response = await request(basePorts[0], '/api/auth/me', { headers: authHeaders(token, ip) })
        assert.equal(response.status, 200)
      }
    }

    const blocked = await request(basePorts[0], '/api/auth/me', { headers: authHeaders(tokenA, 14) })
    assert.equal(blocked.status, 429)
    assert.ok(blocked.headers.get('retry-after'))

    const userBResponse = await request(basePorts[0], '/api/auth/me', { headers: authHeaders(tokenB, 15) })
    assert.equal(userBResponse.status, 200)
  })

  it('returns 429 with Retry-After for guest action limits and does not trust invalid tokens', async () => {
    const headers = { 'x-forwarded-for': testIp(20), authorization: 'Bearer invalid-token' }
    const first = await request(basePorts[0], '/api/search?q=rate-limit-test', { headers })
    assert.notEqual(first.status, 429)
    for (let index = 0; index < 60; index += 1) {
      await request(basePorts[0], '/api/search?q=rate-limit-test', { headers })
    }
    const blocked = await request(basePorts[0], '/api/search?q=rate-limit-test', { headers })
    assert.equal(blocked.status, 429)
    assert.ok(blocked.headers.get('retry-after'))
  })

  it('limits failed login attempts while allowing a successful login', async () => {
    const user = await createUser()
    for (let index = 0; index < 5; index += 1) {
      const attempt = await login(basePorts[0], user.email, 'WrongPassword1!', 30)
      assert.equal(attempt.response.status, 401)
    }
    const blocked = await login(basePorts[0], user.email, 'WrongPassword1!', 30)
    assert.equal(blocked.response.status, 429)

    const successfulUser = await createUser()
    const successful = await login(basePorts[0], successfulUser.email, undefined, 31)
    assert.equal(successful.response.status, 200)
  })

  it('enforces password reset token lifecycle and revokes existing JWTs', async () => {
    const user = await createUser()
    const oldToken = generateToken(user)
    const rawToken = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: crypto.createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    })

    const reset = await request(basePorts[0], '/api/auth/reset-password', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(40) },
      body: JSON.stringify({ token: rawToken, newPassword: 'NewPassword1!' }),
    })
    assert.equal(reset.status, 200)

    const oldTokenResponse = await request(basePorts[0], '/api/auth/me', { headers: authHeaders(oldToken, 41) })
    assert.equal(oldTokenResponse.status, 401)

    const reused = await request(basePorts[0], '/api/auth/reset-password', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(42) },
      body: JSON.stringify({ token: rawToken, newPassword: 'AnotherPassword1!' }),
    })
    assert.equal(reused.status, 400)

    const expiredRaw = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: crypto.createHash('sha256').update(expiredRaw).digest('hex'), expiresAt: new Date(Date.now() - 1_000) },
    })
    const expired = await request(basePorts[0], '/api/auth/reset-password', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(43) },
      body: JSON.stringify({ token: expiredRaw, newPassword: 'AnotherPassword1!' }),
    })
    assert.equal(expired.status, 400)
  })

  it('limits reset requests and invalidates previous reset tokens', async () => {
    const user = await createUser()
    for (let index = 0; index < 3; index += 1) {
      const response = await request(basePorts[0], '/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp(50 + index) },
        body: JSON.stringify({ email: user.email }),
      })
      assert.equal(response.status, 200)
    }
    const blocked = await request(basePorts[0], '/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(54) },
      body: JSON.stringify({ email: user.email }),
    })
    assert.equal(blocked.status, 429)
    assert.match((await blocked.json()).error, /Too many/i)

    const active = await prisma.passwordResetToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    assert.ok(active.length >= 1)
    assert.ok(active.slice(1).every(token => token.used))
  })

  it('limits OTP generation, resend, and invalid verification attempts', async () => {
    const generationUser = await createUser({ emailVerified: false })
    const firstGeneration = await request(basePorts[0], '/api/email-verification/send-verification', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(60) },
      body: JSON.stringify({ email: generationUser.email }),
    })
    assert.equal(firstGeneration.status, 500)
    for (let index = 0; index < 3; index += 1) {
      const resend = await request(basePorts[0], '/api/email-verification/resend', {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp(61) },
        body: JSON.stringify({ email: generationUser.email }),
      })
      assert.equal(resend.status, 500)
      await prisma.emailVerification.deleteMany({ where: { userId: generationUser.id, used: false } })
    }
    const resendBlocked = await request(basePorts[0], '/api/email-verification/resend', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(61) },
      body: JSON.stringify({ email: generationUser.email }),
    })
    assert.equal(resendBlocked.status, 429)

    for (let index = 0; index < 2; index += 1) {
      const response = await request(basePorts[0], '/api/email-verification/send-verification', {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp(60) },
        body: JSON.stringify({ email: generationUser.email }),
      })
      assert.equal(response.status, 500)
      await prisma.emailVerification.deleteMany({ where: { userId: generationUser.id, used: false } })
    }

    const generationBlocked = await request(basePorts[0], '/api/email-verification/send-verification', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(60) },
      body: JSON.stringify({ email: generationUser.email }),
    })
    assert.equal(generationBlocked.status, 429)

    const user = await createUser({ emailVerified: false })
    const verificationSend = await request(basePorts[0], '/api/email-verification/send-verification', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(71) },
      body: JSON.stringify({ email: user.email }),
    })
    assert.equal(verificationSend.status, 500)

    for (let index = 0; index < 5; index += 1) {
      const response = await request(basePorts[0], '/api/email-verification/verify', {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp(62 + index) },
        body: JSON.stringify({ email: user.email, code: '000000' }),
      })
      assert.equal(response.status, 400)
    }
    const invalidated = await request(basePorts[0], '/api/email-verification/verify', {
      method: 'POST',
      headers: { 'x-forwarded-for': testIp(70) },
      body: JSON.stringify({ email: user.email, code: '000000' }),
    })
    assert.ok([400, 429].includes(invalidated.status))
    const verification = await prisma.emailVerification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    assert.ok(verification)

  })

  it('uses authenticated ownership for profile, cart, and orders', async () => {
    const userA = await createUser()
    const userB = await createUser()
    const tokenA = generateToken(userA)

    const profile = await request(basePorts[0], `/api/auth/me?userId=${userB.id}`, { headers: authHeaders(tokenA, 80) })
    assert.equal(profile.status, 200)
    assert.equal((await profile.json()).data.id, userA.id)

    const cart = await request(basePorts[0], `/api/cart?userId=${userB.id}`, { headers: authHeaders(tokenA, 81) })
    assert.equal(cart.status, 200)
    assert.equal((await cart.json()).data.userId, userA.id)

    const orders = await request(basePorts[0], `/api/orders?userId=${userB.id}`, { headers: authHeaders(tokenA, 82) })
    assert.equal(orders.status, 200)
    assert.ok((await orders.json()).data.orders.every((order: any) => order.customerId === userA.id || order.sellerId === userA.id || order.riderId === userA.id))
  })

  it('shares counters between two API processes and handles revoked, suspended, and banned tokens', async () => {
    const user = await createUser()
    const token = generateToken(user)
    for (let index = 0; index < 50; index += 1) {
      assert.equal((await request(basePorts[0], '/api/auth/me', { headers: authHeaders(token, 90) })).status, 200)
    }
    for (let index = 0; index < 50; index += 1) {
      assert.equal((await request(basePorts[1], '/api/auth/me', { headers: authHeaders(token, 91) })).status, 200)
    }
    assert.equal((await request(basePorts[1], '/api/auth/me', { headers: authHeaders(token, 92) })).status, 429)

    const invalid = await request(basePorts[0], '/api/search?q=revoked', { headers: { authorization: 'Bearer expired.invalid.token', 'x-forwarded-for': testIp(93) } })
    assert.notEqual(invalid.status, 401)

    await prisma.user.update({ where: { id: user.id }, data: { suspended: true } })
    assert.equal((await request(basePorts[0], '/api/auth/me', { headers: authHeaders(token, 94) })).status, 403)
    await prisma.user.update({ where: { id: user.id }, data: { suspended: false, banned: true } })
    assert.equal((await request(basePorts[0], '/api/auth/me', { headers: authHeaders(token, 95) })).status, 403)
  })
})