'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Flag, Send } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'

const REPORT_TYPES = [
  { value: 'product', label: 'Product', description: 'Report a product listing' },
  { value: 'shop', label: 'Shop', description: 'Report a shop or seller' },
  { value: 'seller', label: 'Seller', description: 'Report a seller behavior' },
  { value: 'review', label: 'Review', description: 'Report a review' },
  { value: 'message', label: 'Message', description: 'Report a message' },
  { value: 'user', label: 'User', description: 'Report a user profile' },
]

const REASONS = [
  'Spam',
  'Inappropriate content',
  'Fraud or scam',
  'Harassment',
  'Misleading information',
  'Intellectual property violation',
  'Other',
]

export default function ReportPage() {
  const router = useRouter()
  const [reportType, setReportType] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [targetId, setTargetId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportType || !reason) {
      setError('Please select a type and reason')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await api.post('/reports', {
        type: reportType,
        targetId: targetId || undefined,
        reason,
        description: description || undefined,
      })

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          router.back()
        }, 2000)
      } else {
        setError(response.error || 'Failed to submit report')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ArrowLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Report
            </h1>
            <p className="text-warm-800/60">Help us keep the community safe</p>
          </div>
        </div>

        {success && (
          <Card className="p-6 mb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send size={24} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-warm-900 mb-1">Report Submitted</h3>
            <p className="text-sm text-warm-800/60">Thank you for helping keep our community safe.</p>
          </Card>
        )}

        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-warm-900 mb-3">What do you want to report?</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setReportType(type.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      reportType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <span className="font-medium text-sm text-warm-900 block">{type.label}</span>
                    <span className="text-xs text-warm-800/60">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-900 mb-3">Reason</label>
              <div className="flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      reason === r
                        ? 'bg-primary text-white'
                        : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-900 mb-2">Target ID (optional)</label>
              <Input
                placeholder="e.g., product ID, shop ID, user ID"
                value={targetId}
                onValueChange={setTargetId}
              />
              <p className="text-xs text-warm-800/50 mt-1">Leave empty if reporting general content</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-800/60 mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about the issue..."
                rows={4}
                className="w-full bg-warm-50 border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <Button fullWidth type="submit" disabled={submitting || !reportType || !reason}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
