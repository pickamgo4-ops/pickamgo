'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

interface BookingRule {
  autoConfirm: boolean
  requireDeposit: boolean
  depositAmount?: number
  minBookingNoticeHours: number
  maxAdvanceBookingDays: number
  cancellationHours: number
  bufferTimeMinutes: number
  allowStaffSelection: boolean
  allowTimeSelection: boolean
  maxBookingsPerDay?: number
}

export default function BookingRulesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<BookingRule>({
    autoConfirm: false,
    requireDeposit: false,
    minBookingNoticeHours: 2,
    maxAdvanceBookingDays: 30,
    cancellationHours: 24,
    bufferTimeMinutes: 0,
    allowStaffSelection: true,
    allowTimeSelection: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get<BookingRule>('/booking-setup/rules')
      if (res.success && res.data) setRules(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await api.patch<BookingRule>('/booking-setup/rules', rules)
      if (res.success) setMessage('Rules saved successfully')
      else setMessage(res.error || 'Failed to save')
    } catch (err: any) {
      setMessage(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SellerSidebar><div className="py-20 text-center text-warm-800/60">Loading...</div></SellerSidebar>
  }

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/seller/booking-setup')} className="p-2 rounded-xl hover:bg-warm-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-warm-900">Booking Rules</h1>
            <p className="text-sm text-warm-800/60">Configure how bookings work for your shop.</p>
          </div>
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}

        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-warm-900 mb-2">Approval & Confirmation</h2>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-warm-200 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.autoConfirm}
                onChange={e => setRules({ ...rules, autoConfirm: e.target.checked })}
                className="w-4 h-4 mt-1"
              />
              <div>
                <p className="font-medium text-warm-900">Auto-confirm bookings</p>
                <p className="text-sm text-warm-800/60">If unchecked, you must manually approve each booking.</p>
              </div>
            </label>
          </div>

          <div>
            <h2 className="font-semibold text-warm-900 mb-2">Time Windows</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-warm-800">Minimum booking notice (hours)</label>
                <Input
                  type="number"
                  min="0"
                  value={rules.minBookingNoticeHours}
                  onChange={e => setRules({ ...rules, minBookingNoticeHours: Number(e.target.value) })}
                />
                <p className="text-xs text-warm-800/60 mt-1">How far in advance customers must book.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-warm-800">Max advance booking (days)</label>
                <Input
                  type="number"
                  min="1"
                  value={rules.maxAdvanceBookingDays}
                  onChange={e => setRules({ ...rules, maxAdvanceBookingDays: Number(e.target.value) })}
                />
                <p className="text-xs text-warm-800/60 mt-1">How far into the future customers can book.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-warm-800">Cancellation window (hours)</label>
                <Input
                  type="number"
                  min="0"
                  value={rules.cancellationHours}
                  onChange={e => setRules({ ...rules, cancellationHours: Number(e.target.value) })}
                />
                <p className="text-xs text-warm-800/60 mt-1">How late customers can cancel.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-warm-800">Buffer time (minutes)</label>
                <Input
                  type="number"
                  min="0"
                  value={rules.bufferTimeMinutes}
                  onChange={e => setRules({ ...rules, bufferTimeMinutes: Number(e.target.value) })}
                />
                <p className="text-xs text-warm-800/60 mt-1">Time between consecutive bookings.</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-warm-900 mb-2">Customer Choices</h2>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-warm-200 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={rules.allowStaffSelection}
                onChange={e => setRules({ ...rules, allowStaffSelection: e.target.checked })}
                className="w-4 h-4 mt-1"
              />
              <div>
                <p className="font-medium text-warm-900">Customers can select a staff member</p>
                <p className="text-sm text-warm-800/60">Uncheck if your business doesn&apos;t require choosing a specific person.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-warm-200 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.allowTimeSelection}
                onChange={e => setRules({ ...rules, allowTimeSelection: e.target.checked })}
                className="w-4 h-4 mt-1"
              />
              <div>
                <p className="font-medium text-warm-900">Customers can choose a specific time</p>
                <p className="text-sm text-warm-800/60">Uncheck to require customers to use a default slot.</p>
              </div>
            </label>
          </div>

          <div>
            <h2 className="font-semibold text-warm-900 mb-2">Limits</h2>
            <div>
              <label className="text-sm font-medium text-warm-800">Max bookings per day (optional)</label>
              <Input
                type="number"
                min="1"
                value={rules.maxBookingsPerDay || ''}
                onChange={e => setRules({ ...rules, maxBookingsPerDay: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-warm-200 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Rules'}
            </Button>
          </div>
        </Card>
      </div>
    </SellerSidebar>
  )
}
