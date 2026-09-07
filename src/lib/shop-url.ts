export function getShopUrl(slug: string): string {
  return `/shop/${encodeURIComponent(slug)}`
}