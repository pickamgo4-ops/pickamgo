import crypto from 'crypto'

export function generateOrderNumber(): string {
  return `PICK ${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}
