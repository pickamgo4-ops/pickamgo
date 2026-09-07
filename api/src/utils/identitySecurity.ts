import crypto from 'crypto'

export function normalizeIdentityName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0]
    row[0] = leftIndex
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex]
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1] ? diagonal : 1 + Math.min(diagonal, row[rightIndex - 1], previous)
      diagonal = previous
    }
  }
  return row[right.length]
}

export function identitySimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeIdentityName(left).replace(/official$/, '')
  const normalizedRight = normalizeIdentityName(right).replace(/official$/, '')
  if (!normalizedLeft || !normalizedRight) return 0
  if (normalizedLeft === normalizedRight) return 1
  return 1 - editDistance(normalizedLeft, normalizedRight) / Math.max(normalizedLeft.length, normalizedRight.length)
}

export function hashSensitiveIdentity(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export function maskPhoneNumber(phone: string): string {
  return `••••${phone.slice(-4)}`
}

export function isPlatformImpersonationName(value: string): boolean {
  const normalized = normalizeIdentityName(value)
  return normalized === 'pickamgo' || normalized.startsWith('pickamgoofficial') || normalized.includes('pickamgoofficial')
}

export function isPayoutBeneficiaryVerified(params: {
  userName: string
  beneficiaryName?: string | null
  registeredPhone: string
  payoutPhone: string
  phoneVerified: boolean
}): boolean {
  return params.phoneVerified &&
    params.registeredPhone === params.payoutPhone &&
    Boolean(params.beneficiaryName) &&
    normalizeIdentityName(params.userName) === normalizeIdentityName(params.beneficiaryName || '')
}

export function isCurrentPayoutDisclaimer(version?: string | null): boolean {
  return version === PAYOUT_DISCLAIMER_VERSION
}

export function isPayoutChangeCooldownActive(changedAt: Date | null | undefined, now = new Date()): boolean {
  return Boolean(changedAt && now.getTime() - changedAt.getTime() < 24 * 60 * 60 * 1000)
}

export const PAYOUT_DISCLAIMER_VERSION = '2026-09-07'