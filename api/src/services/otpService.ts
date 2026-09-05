import crypto from 'crypto'
import prisma from '../utils/prisma'
import { consumeRateLimit, getRequestIp, isRateLimited } from '../middleware/rate-limit'
import type { AuthenticatedRequest } from '../middleware/auth'

export const OTP_PURPOSES = ['REGISTRATION', 'LOGIN', 'PASSWORD_RESET', 'PHONE_VERIFICATION', 'PHONE_CHANGE', 'SELLER_VERIFICATION', 'RIDER_VERIFICATION'] as const
export type OtpPurpose = typeof OTP_PURPOSES[number]

const ARKESEL_URL = 'https://sms.arkesel.com/sms/api'

function numericEnv(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] || fallback)
  return Number.isFinite(value) && value >= minimum ? Math.floor(value) : fallback
}

export function normalizeGhanaPhone(input: string): string {
  const compact = input.trim().replace(/[\s().-]/g, '')
  if (compact.startsWith('+233')) return `233${compact.slice(4)}`
  if (compact.startsWith('233')) return compact
  if (/^0\d{9}$/.test(compact)) return `233${compact.slice(1)}`
  throw new Error('Invalid Ghana phone number')
}

export function generateOtp(length = numericEnv('OTP_LENGTH', 6, 4)): string {
  const max = 10 ** length
  const value = crypto.randomInt(0, max)
  return value.toString().padStart(length, '0')
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

function getConfig() {
  return {
    expiryMinutes: numericEnv('OTP_EXPIRY_MINUTES', 5, 1),
    length: numericEnv('OTP_LENGTH', 6, 4),
    maxAttempts: numericEnv('OTP_MAX_ATTEMPTS', 5, 1),
    cooldownSeconds: numericEnv('OTP_RESEND_COOLDOWN_SECONDS', 60, 1),
  }
}

function genericArkeselError(): Error {
  return new Error('Unable to send verification code')
}

export async function sendArkeselSms(phoneNumber: string, message: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const apiKey = process.env.ARKESEL_API_KEY?.trim()
  if (!apiKey) throw genericArkeselError()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetchImpl(ARKESEL_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'send-sms',
        api_key: apiKey,
        to: phoneNumber,
        from: process.env.ARKESEL_SENDER_ID || 'PickAmGo',
        sms: message,
      }),
    })
    const raw = await response.text()
    let parsed: any = null
    try { parsed = JSON.parse(raw) } catch { /* Arkesel may return plain text. */ }
    const statusText = `${parsed?.status || parsed?.code || raw}`.toLowerCase()
    if (!response.ok || /error|fail|invalid|insufficient|balance/.test(statusText)) throw genericArkeselError()
  } catch {
    throw genericArkeselError()
  } finally {
    clearTimeout(timeout)
  }
}

function otpMessage(otp: string, expiryMinutes: number): string {
  return `Your PickAmGo verification code is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code with anyone.`
}

export async function createAndSendOtp(params: {
  phoneNumber: string
  purpose: OtpPurpose
  userId?: string
  request?: AuthenticatedRequest
}): Promise<{ phoneNumber: string; expiresAt: Date; cooldownSeconds: number }> {
  const config = getConfig()
  const phoneNumber = normalizeGhanaPhone(params.phoneNumber)
  const ip = params.request ? getRequestIp(params.request) : 'unknown'
  const userIdentity = params.userId ? `user:${params.userId}:${params.purpose}` : null
  const identities = [
    [`otp-send-phone:${params.purpose}`, phoneNumber, 3, 10 * 60_000] as const,
    ['otp-send-ip', `${ip}:${params.purpose}`, 10, 60 * 60_000] as const,
  ]
  if (userIdentity) identities.push(['otp-send-user', userIdentity, 3, 10 * 60_000])
  for (const [category, identity, limit, windowMs] of identities) {
    if (await isRateLimited(category, identity, limit, windowMs)) throw new Error('Too many verification requests')
  }

  const latest = await prisma.phoneOtp.findFirst({ where: { phoneNumber, purpose: params.purpose, userId: params.userId, verifiedAt: null }, orderBy: { createdAt: 'desc' } })
  if (latest) {
    const remaining = config.cooldownSeconds - Math.floor((Date.now() - latest.createdAt.getTime()) / 1000)
    if (remaining > 0) throw new Error(`Please wait ${remaining} seconds before requesting another code`)
  }

  const otp = generateOtp(config.length)
  const expiresAt = new Date(Date.now() + config.expiryMinutes * 60_000)
  await sendArkeselSms(phoneNumber, otpMessage(otp, config.expiryMinutes))
  await prisma.phoneOtp.updateMany({ where: { phoneNumber, purpose: params.purpose, userId: params.userId, verifiedAt: null }, data: { verifiedAt: new Date() } })
  await prisma.phoneOtp.create({ data: { userId: params.userId, phoneNumber, purpose: params.purpose, otpHash: hashOtp(otp), expiresAt, maxAttempts: config.maxAttempts } })
  for (const [category, identity, limit, windowMs] of identities) await consumeRateLimit(category, identity, limit, windowMs)
  return { phoneNumber, expiresAt, cooldownSeconds: config.cooldownSeconds }
}

export async function verifyOtp(params: { phoneNumber: string; otp: string; purpose: OtpPurpose; userId?: string }): Promise<{ phoneNumber: string; userId?: string }> {
  const phoneNumber = normalizeGhanaPhone(params.phoneNumber)
  const config = getConfig()
  if (!new RegExp(`^\\d{${config.length}}$`).test(params.otp)) throw new Error('Invalid verification code')
  const verification = await prisma.phoneOtp.findFirst({ where: { phoneNumber, purpose: params.purpose, userId: params.userId, verifiedAt: null }, orderBy: { createdAt: 'desc' } })
  if (!verification || verification.expiresAt <= new Date()) throw new Error('This verification code has expired. Please request a new code.')
  if (verification.attempts >= verification.maxAttempts) throw new Error('This verification code is no longer valid. Please request a new code.')
  if (hashOtp(params.otp) !== verification.otpHash) {
    const updated = await prisma.phoneOtp.update({ where: { id: verification.id }, data: { attempts: { increment: 1 } } })
    if (updated.attempts >= updated.maxAttempts) await prisma.phoneOtp.update({ where: { id: verification.id }, data: { verifiedAt: new Date() } })
    throw new Error(updated.attempts >= updated.maxAttempts ? 'This verification code is no longer valid. Please request a new code.' : 'Invalid verification code')
  }
  await prisma.$transaction([
    prisma.phoneOtp.update({ where: { id: verification.id }, data: { verifiedAt: new Date() } }),
    prisma.phoneOtp.updateMany({ where: { phoneNumber, purpose: params.purpose, userId: params.userId, id: { not: verification.id }, verifiedAt: null }, data: { verifiedAt: new Date() } }),
  ])
  return { phoneNumber, userId: verification.userId || undefined }
}