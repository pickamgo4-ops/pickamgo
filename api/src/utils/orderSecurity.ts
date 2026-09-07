export const ORDER_EVIDENCE_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO'] as const

export type OrderEvidenceStatus = typeof ORDER_EVIDENCE_STATUS[number]

export function normalizeEvidenceStatus(value?: string | null): OrderEvidenceStatus {
  if (!value) return 'PENDING'

  const normalized = value.toUpperCase().replace(/[-\s]+/g, '_')
  switch (normalized) {
    case 'APPROVED':
    case 'VERIFIED':
      return 'APPROVED'
    case 'REJECTED':
    case 'DENIED':
      return 'REJECTED'
    case 'NEEDS_MORE_INFO':
    case 'MORE_INFO_REQUIRED':
    case 'NEEDS_MORE_INFORMATION':
      return 'NEEDS_MORE_INFO'
    case 'PENDING':
    case 'WAITING':
      return 'PENDING'
    default:
      return 'PENDING'
  }
}

export function canAccessOrderEvidence(
  order: { customerId?: string | null; sellerId?: string | null; riderId?: string | null },
  userId: string,
  isAdmin = false,
) {
  if (isAdmin) return true

  return Boolean(
    order.customerId === userId ||
    order.sellerId === userId ||
    order.riderId === userId,
  )
}

export function isSafeEvidenceUrl(value: string): boolean {
  const normalized = value.trim()
  if (normalized.includes('..') || normalized.includes('\\')) return false
  if (normalized.startsWith('/uploads/')) return true

  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '')
  return Boolean(publicUrl && normalized.startsWith(`${publicUrl}/uploads/`))
}