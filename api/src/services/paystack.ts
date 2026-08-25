import axios from 'axios'
import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

const paystack = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
})

export async function createTransferRecipient(userId: string, type: string, provider: string, phoneNumber: string, accountName?: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await paystack.post('/transferrecipient', {
    type: 'mobile_money',
    name: accountName || userId,
    account_number: phoneNumber,
    bank_code: getProviderCode(provider),
    currency: 'GHS',
  })

  return response.data.data
}

export async function initiateTransfer(userId: string, amount: number, currency: string, recipientCode: string, reference: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await paystack.post('/transfer', {
    source: 'balance',
    amount: Math.round(amount * 100),
    recipient: recipientCode,
    reference,
    currency,
  })

  return response.data.data
}

export async function verifyTransfer(reference: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await paystack.get(`/transfer/${encodeURIComponent(reference)}`)
  return response.data.data
}

export async function verifyTransaction(reference: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await paystack.get(`/transaction/verify/${encodeURIComponent(reference)}`)
  return response.data.data
}

export async function handleWebhook(payload: any, signature?: string): Promise<any> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  if (!signature) {
    throw new Error('Missing webhook signature')
  }
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(payload)).digest('hex')
  const expected = Buffer.from(hash, 'hex')
  const received = Buffer.from(signature, 'hex')
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error('Invalid webhook signature')
  }

  const event = payload.event
  const data = payload.data

  switch (event) {
    case 'transfer.success':
      return { status: 'SUCCESS', transfer: data }
    case 'transfer.failed':
      return { status: 'FAILED', transfer: data }
    case 'transfer.reversed':
      return { status: 'REVERSED', transfer: data }
    default:
      return { status: 'UNKNOWN', event, data }
  }
}

function getProviderCode(provider: string): string {
  const codes: Record<string, string> = {
    MTN: 'MTN',
    VODAFONE: 'VOD',
    AIRTELTIGO: 'ATL',
  }
  return codes[provider.toUpperCase()] || 'MTN'
}

export { paystack }
