import bcrypt from 'bcrypt'
import crypto from 'crypto'

export interface EmailVerificationCode {
  id: string
  userId: string
  email: string
  code: string
  hashedCode: string
  expiresAt: Date
  used: boolean
  attempts: number
  maxAttempts: number
  createdAt: Date
}

export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

export async function compareCode(code: string, hashedCode: string): Promise<boolean> {
  return bcrypt.compare(code, hashedCode)
}

export function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function canAttempt(verification: EmailVerificationCode): boolean {
  return !verification.used && verification.attempts < verification.maxAttempts && !isCodeExpired(verification.expiresAt)
}

export function createVerificationCode(userId: string, email: string, code: string, ttlMinutes = 10): Omit<EmailVerificationCode, 'id' | 'createdAt'> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes)

  return {
    userId,
    email,
    code,
    hashedCode: '', // Will be set by caller after hashing
    expiresAt,
    used: false,
    attempts: 0,
    maxAttempts: 5,
  }
}
