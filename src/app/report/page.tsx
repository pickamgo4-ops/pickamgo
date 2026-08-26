'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Flag, Send, Upload } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'

const REPORT_CATEGORIES = [
  { value: 'FRAUD', label: 'Fraud or scam', description: 'Suspected fraudulent activity' },
  { value: 'PAYMENT_ISSUE', label: 'Payment issue', description: 'Problems with payments' },
  { value: 'WRONG_PRODUCT', label: 'Wrong/misleading product', description: 'Product not as described' },
  { value: 'HARASSMENT', label: 'Harassment', description: 'Inappropriate behavior' },
  { value: 'FAKE_SHOP', label: 'Fake shop/account', description: 'Suspected fake shop or account' },
  { value: 'ORDER_PROBLEM', label: 'Order problem', description: 'Issues with an order' },
  { value: 'DELIVERY_PROBLEM', label: 'Delivery problem', description: 'Issues with delivery' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious activity', description: 'Unusual or suspicious behavior' },
  { value: 'OTHER', label: 'Other', description: 'Other problems' },
]

const TARGET_TYPES = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'ORDER', label: 'Order' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'RIDER', label: 'Rider' },
  { value: 'MESSAGE', label: 'Message' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'USER', label: 'User' },
  { value: 'OTHER', label: 'Other' },
]

export default function ReportPage() {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !targetType || !reason) {
      setError('Please select a category, target type, and reason')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await api.post('/reports', {
        category,
        targetType,
        targetId: targetId || undefined,
        reason,
        description: description || undefined,
        attachmentUrl: attachmentUrl || undefined,
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

  const uploadAttachment = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      setError('')
      try {
        const body = new FormData()
        body.append('image', file)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body,
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const data = await response.json()
        if (data.success) {
          setAttachmentUrl(data.data.url)
        } else {
          setError(data.error || 'Image upload failed')
        }
      } catch (err) {
        console.error('Upload fetch error:', err)
        setError(err instanceof Error && err.name === 'AbortError' ? 'Upload timed out. Please try again.' : 'Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    }
    input.click()
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
            <h3 className="font-semibold text-warm-900 mb-1">Report submitted successfully. Our team will review it.</h3>
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
              <label className="block text-sm font-medium text-warm-900 mb-3">What are you reporting?</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      category === cat.value
                        ? 'border-primary bg-primary/5'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <span className="font-medium text-sm text-warm-900 block">{cat.label}</span>
                    <span className="text-xs text-warm-800/60">{cat.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-900 mb-3">What type of thing are you reporting?</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTargetType(t.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      targetType === t.value
                        ? 'bg-primary text-white'
                        : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-900 mb-2">Target ID (optional)</label>
              <Input
                placeholder="e.g., product ID, shop ID, order ID"
                value={targetId}
                onValueChange={setTargetId}
              />
              <p className="text-xs text-warm-800/50 mt-1">Leave empty if reporting general content</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-900 mb-2">Reason</label>
              <Input
                placeholder="Brief reason for the report"
                value={reason}
                onValueChange={setReason}
                required
              />
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

            <div>
              <label className="block text-sm font-medium text-warm-900 mb-2">Supporting image (optional)</label>
              <div className="flex gap-2 mb-2">
                <Button type="button" variant="outline" onClick={uploadAttachment} disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
              <Input
                placeholder="Or paste image URL"
                value={attachmentUrl}
                onValueChange={setAttachmentUrl}
              />
              {attachmentUrl && (
                <div className="mt-3 w-32 h-32 rounded-xl overflow-hidden bg-warm-200 border border-warm-200">
                  <img src={attachmentUrl} alt="Attachment preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <Button fullWidth type="submit" disabled={submitting || !category || !targetType || !reason}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
