export function getAppUrl(): string {
  const raw = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
  const url = raw.split(',')[0]?.trim() || raw.trim()
  return url.replace(/\/+$/, '')
}
