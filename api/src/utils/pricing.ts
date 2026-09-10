export function calculatePercentageOff(originalPrice: unknown, currentPrice: unknown): number | undefined {
  const original = Number(originalPrice)
  const current = Number(currentPrice)
  if (!Number.isFinite(original) || !Number.isFinite(current) || original <= current || original <= 0) return undefined
  return Math.round(((original - current) / original) * 100)
}

export function withCalculatedProductDiscount<T extends { price: unknown; originalPrice?: unknown; discount?: unknown }>(product: T): T & { discount?: number } {
  const discount = calculatePercentageOff(product.originalPrice, product.price)
  return { ...product, discount }
}
