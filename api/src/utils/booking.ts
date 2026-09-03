const DEFAULT_TIME_ZONE = 'Africa/Accra'

export function getBookingTimeZone(): string {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIME_ZONE
}

export function getDateInBookingTimeZone(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getBookingTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function getDayOfWeek(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
}

export function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12))
  return date.toISOString().slice(0, 10)
}

export function parseTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2])
  const period = match[3]?.toUpperCase()
  if (minute > 59) return null
  if (period) {
    if (hour < 1 || hour > 12) return null
    if (period === 'AM' && hour === 12) hour = 0
    if (period === 'PM' && hour !== 12) hour += 12
  } else if (hour > 23) {
    return null
  }
  return hour * 60 + minute
}

export function getCurrentMinutesInBookingTimeZone(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: getBookingTimeZone(),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return Number(values.hour) * 60 + Number(values.minute)
}

export function parseTimeSlots(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.every(slot => typeof slot === 'string')) return parsed
  } catch {
    // Older records use comma-separated slots.
  }
  return value.split(',').map(slot => slot.trim()).filter(Boolean)
}
