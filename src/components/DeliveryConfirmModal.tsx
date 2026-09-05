'use client'

import React, { useState } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function DeliveryConfirmModal({
  deliveryId,
  orderId,
  orderNumber,
  onComplete,
  onCancel,
}: {
  deliveryId: string
  orderId?: string
  orderNumber?: string
  onComplete: (code: string) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 4) {
      setError('Please enter the complete verification code')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await onComplete(code)
      if (!res.success) {
        setError(res.error || 'Failed to verify delivery')
      }
    } catch {
      setError('Failed to verify delivery')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-warm-900">Confirm Delivery</h2>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-warm-100 text-warm-800/60">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Delivery Verification</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Ask the customer for the verification code shown on their phone.
              Enter it here to confirm delivery.
            </p>
          </div>
        </div>

        {orderNumber && (
          <p className="text-sm text-warm-800/70 mb-4">Order: #{orderNumber}</p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit code"
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-center text-2xl font-bold text-warm-900 tracking-widther focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
            <p className="text-xs text-warm-800/50 mt-1.5">The code is displayed to the customer in their app</p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={submitting} icon={<CheckCircle size={18} />}>
              {submitting ? 'Verifying...' : 'Confirm Delivery'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
