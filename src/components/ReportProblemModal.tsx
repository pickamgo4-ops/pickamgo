'use client'

import React, { useState } from 'react'
import { X, AlertCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { REPORT_PROBLEM_OPTIONS } from '@/lib/rider-constants'

export function ReportProblemModal({
  deliveryId,
  orderId,
  onClose,
  onSubmit,
}: {
  deliveryId?: string
  orderId?: string
  onClose: () => void
  onSubmit: (data: { reason: string; description?: string }) => Promise<{ success: boolean; error?: string }>
}) {
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReason) {
      setError('Please select a reason')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await onSubmit({ reason: selectedReason, description: description.trim() || undefined })
      if (!res.success) {
        setError(res.error || 'Failed to submit report')
      }
    } catch {
      setError('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900">Report a Problem</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-warm-100 text-warm-800/60">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-warm-800/70 mb-4">
          Tell us what went wrong. Your report will be reviewed by support and will not affect your delivery negatively if it is a legitimate issue.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warm-900 mb-2">
              Select a reason
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {REPORT_PROBLEM_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedReason === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      checked={selectedReason === option.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    <Icon size={18} className={selectedReason === option.value ? 'text-primary' : 'text-warm-800/50'} />
                    <span className="text-sm font-medium text-warm-900">{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional details about this issue..."
              rows={4}
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={submitting} icon={<Send size={18} />}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
