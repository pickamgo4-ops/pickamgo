const normalizedAliases: Array<[RegExp, string]> = [
  [/w\s*h\s*a\s*t\s*s\s*a\s*p\s*p/g, ' whatsapp '],
  [/t\s*e\s*l\s*e\s*g\s*r\s*a\s*m/g, ' telegram '],
  [/m\s*o\s*b\s*i\s*o/g, ' momo '],
  [/m\s*o\s*b\s*i/g, ' momo '],
  [/s\s*i\s*g\s*n\s*a\s*l/g, ' signal '],
]

export function normalizeForModeration(input: string): string {
  if (!input) return ''

  let value = input.toLowerCase().trim()
  value = value.replace(/@/g, ' at ')
  value = value.replace(/\./g, ' ')
  value = value.replace(/[-_]/g, ' ')
  value = value.replace(/\s+/g, ' ')

  for (const [pattern, replacement] of normalizedAliases) {
    value = value.replace(pattern, replacement)
  }

  value = value
    .replace(/zero/g, '0')
    .replace(/one/g, '1')
    .replace(/two/g, '2')
    .replace(/three/g, '3')
    .replace(/four/g, '4')
    .replace(/five/g, '5')
    .replace(/six/g, '6')
    .replace(/seven/g, '7')
    .replace(/eight/g, '8')
    .replace(/nine/g, '9')
    .replace(/\s+/g, ' ')

  return value
}

export function containsDisallowedContactPattern(input: string): boolean {
  const value = normalizeForModeration(input || '')
  if (!value) return false

  const suspiciousWords = [
    'whatsapp', 'telegram', 'signal', 'wa me', 'call me', 'text me', 'contact me privately',
    'contact me on', 'pay me directly', 'pay outside', 'send money to my', 'send the money',
    'my number is', 'my whatsapp', 'my telegram', 'momo', 'mobile money', 'bank account',
    'account number', 'bank transfer', 'cash app', 'paystack', 'transfer to', 'cash me',
    'pay directly', 'outside pickamgo', 'pay through', 'do not pay on pickamgo', 'cancel order and pay',
    'contact me privately', 'dm me', 'message me on', 'pay using', 'send me your number',
  ]

  const hasForbiddenKeyword = suspiciousWords.some((word) => value.includes(word))

  const containsPhonePattern = /(?:\b0\s*\d[\d\s-]{7,}\b)|(?:\b\d{9,15}\b)/.test(value)
  const hasExternalLink = /(wa\.me|t\.me|telegram\.me|instagram\.com|facebook\.com|x\.com|twitter\.com|linkedin\.com)/.test(value)

  return hasForbiddenKeyword || (containsPhonePattern && /(call|text|number|phone|whatsapp|telegram|pay|momo|money|contact|message)/.test(value)) || hasExternalLink
}

export function isOrderEligibleForMessaging(order: any): boolean {
  if (!order) return false
  if (!order.customerId || !order.sellerId) return false

  const status = String(order.status || '').toUpperCase()
  if (['DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED', 'REFUND_PENDING', 'COMPLETED'].includes(status)) {
    return false
  }

  const paymentStatus = String(order.payment?.status || order.paymentStatus || '').toUpperCase()
  if (order.total && Number(order.total) > 0) {
    if (!paymentStatus || paymentStatus === 'PENDING') return false
    if (paymentStatus !== 'PAID' && paymentStatus !== 'SUCCESS') return false
  }

  return true
}

export function detectMessageRisk(content: string): { blocked: boolean; riskLevel: string; reason?: string } {
  const value = normalizeForModeration(content || '')
  if (!value) return { blocked: false, riskLevel: 'NORMAL' }

  if (containsDisallowedContactPattern(content || '')) {
    return {
      blocked: true,
      riskLevel: 'FLAGGED',
      reason: 'Contains personal contact or outside-payment instructions',
    }
  }

  return { blocked: false, riskLevel: 'NORMAL' }
}

export function assertModerationSafe(value: string | undefined | null, context: string): void {
  if (!value) return
  if (containsDisallowedContactPattern(value)) {
    throw new Error(`Unsafe ${context}: blocked by moderation`)
  }
}
