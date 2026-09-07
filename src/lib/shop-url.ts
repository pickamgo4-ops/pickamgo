const marketplaceDomain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'

export function getShopUrl(slug: string): string {
  const encodedSlug = encodeURIComponent(slug)
  if (typeof window === 'undefined') return `https://${encodedSlug}.${marketplaceDomain}`

  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocal) return `/shop/${encodedSlug}`

  return `${window.location.protocol}//${encodedSlug}.${marketplaceDomain}`
}