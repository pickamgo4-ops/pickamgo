'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, Phone } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const purposes = ['PHONE_VERIFICATION', 'PHONE_CHANGE', 'SELLER_VERIFICATION', 'RIDER_VERIFICATION'] as const
type Purpose = typeof purposes[number]

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 6 ? `+${digits.slice(0, 3)} ${digits.slice(3, 5)} *** **${digits.slice(-2)}` : value
}

export default function VerifyPhonePage() {
  const router = useRouter()
  const params = useSearchParams()
  const phoneNumber = params.get('phone') || ''
  const purpose = (purposes.includes(params.get('purpose') as Purpose) ? params.get('purpose') : 'PHONE_VERIFICATION') as Purpose
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!cooldown) return
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const sendCode = async (endpoint: '/auth/otp/send' | '/auth/otp/resend') => {
    setSending(true)
    setError('')
    const response = await api.post<{ cooldownSeconds?: number }>(endpoint, { phoneNumber, purpose })
    if (response.success) setCooldown(response.data?.cooldownSeconds || 60)
    else setError(response.error || 'Unable to send verification code')
    setSending(false)
  }

  const verify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (otp.length !== 6) return setError('Enter the 6-digit verification code')
    setLoading(true)
    setError('')
    const response = await api.post('/auth/otp/verify', { phoneNumber, purpose, otp })
    if (response.success) setSuccess(true)
    else setError(response.error || 'Invalid verification code')
    setLoading(false)
  }

  useEffect(() => {
    if (phoneNumber && !cooldown) void sendCode('/auth/otp/send')
  }, [phoneNumber])

  return (
    <main className="min-h-screen bg-warm-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-warm-800/70 hover:text-primary"><ArrowLeft size={17} /> Back</button>
        <Card className="p-6 sm:p-8">
          {success ? <div className="text-center"><CheckCircle size={48} className="mx-auto text-green-600" /><h1 className="mt-4 font-display text-2xl font-bold text-warm-900">Phone verified</h1><p className="mt-2 text-sm text-warm-800/70">Your phone number has been verified successfully.</p><Button className="mt-6" onClick={() => router.back()}>Continue</Button></div> : <>
            <Phone size={32} className="text-primary" />
            <h1 className="mt-4 font-display text-2xl font-bold text-warm-900">Verify your phone number</h1>
            <p className="mt-2 text-sm text-warm-800/70">We sent a 6-digit verification code to <strong>{maskPhone(phoneNumber)}</strong>.</p>
            <form onSubmit={verify} className="mt-6 space-y-4">
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit code" className="w-full rounded-xl border border-warm-200 bg-white px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-primary" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" fullWidth disabled={loading || sending}>{loading ? 'Verifying...' : 'Verify'}</Button>
            </form>
            <div className="mt-5 text-center text-sm text-warm-800/70">{cooldown > 0 ? `Resend code in ${cooldown}s` : <button type="button" className="font-semibold text-primary hover:underline" disabled={sending} onClick={() => sendCode('/auth/otp/resend')}>{sending ? 'Sending...' : 'Resend code'}</button>}</div>
          </>}
        </Card>
      </div>
    </main>
  )
}
