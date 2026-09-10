const STORAGE_KEY = 'pickamgo-comparison'
const MAX_COMPARISON_PRODUCTS = 4

export function getComparedProductIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, MAX_COMPARISON_PRODUCTS) : []
  } catch {
    return []
  }
}

export function addComparedProduct(id: string): { added: boolean; reason?: 'duplicate' | 'limit' } {
  const ids = getComparedProductIds()
  if (ids.includes(id)) return { added: false, reason: 'duplicate' }
  if (ids.length >= MAX_COMPARISON_PRODUCTS) return { added: false, reason: 'limit' }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]))
  window.dispatchEvent(new Event('comparison-updated'))
  return { added: true }
}

export function removeComparedProduct(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getComparedProductIds().filter(item => item !== id)))
  window.dispatchEvent(new Event('comparison-updated'))
}

export function clearComparedProducts(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('comparison-updated'))
}

export const comparisonLimit = MAX_COMPARISON_PRODUCTS
