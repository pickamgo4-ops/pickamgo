const marketplaceDomain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'

export function getShopUrl(slug: string): string {
  if (typeof window === 'undefined') return `https://${slug}.${marketplaceDomain}`

  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocal) return `/shop/${encodeURIComponent(slug)}`

  return `${window.location.protocol}//${slug}.${marketplaceDomain}`
}