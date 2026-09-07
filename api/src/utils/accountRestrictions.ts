import prisma from './prisma'

export type AccountCapability =
  | 'messaging'
  | 'selling'
  | 'payouts'
  | 'checkout'
  | 'riders'
  | 'reviews'
  | 'logins'

const cache = new Map<string, { restricted: Set<AccountCapability>; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

export async function getActiveRestrictions(userId: string): Promise<Set<AccountCapability>> {
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.restricted

  const now = new Date()
  const records = await prisma.accountRestriction.findMany({
    where: {
      userId,
      status: 'RESTRICTED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { capability: true },
  })

  const restricted = new Set<AccountCapability>(records.map(r => r.capability as AccountCapability))
  cache.set(userId, { restricted, expiresAt: Date.now() + CACHE_TTL_MS })
  return restricted
}

export async function isCapabilityRestricted(userId: string, capability: AccountCapability): Promise<boolean> {
  const restrictions = await getActiveRestrictions(userId)
  return restrictions.has(capability)
}

export function invalidateRestrictionCache(userId?: string) {
  if (userId) cache.delete(userId)
  else cache.clear()
}