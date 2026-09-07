import prisma from './prisma'

export type KillSwitchKey =
  | 'sellerRegistration'
  | 'riderRegistration'
  | 'payouts'
  | 'promoCodes'
  | 'messaging'
  | 'checkout'
  | 'maintenance'

const cache = new Map<KillSwitchKey, { value: boolean; expiresAt: number }>()
const CACHE_TTL_MS = 30_000

export async function isKillSwitchEnabled(key: KillSwitchKey): Promise<boolean> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  try {
    const record = await prisma.systemKillSwitch.findUnique({ where: { key } })
    const value = Boolean(record?.enabled)
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch (error) {
    console.error('Failed to read kill switch:', error)
    return false
  }
}

export function invalidateKillSwitchCache(key?: KillSwitchKey) {
  if (key) cache.delete(key)
  else cache.clear()
}