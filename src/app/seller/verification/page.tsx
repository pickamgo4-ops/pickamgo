'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function SellerVerificationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verification, setVerification] = useState<any>(null)

  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    businessName: '',
    businessType: '',
    businessReg: '',
  })

  useEffect(() => {
    loadVerification()
  }, [])

  const loadVerification = async () => {
    try {
      const response = await api.get<any>('/seller/verification/status')
      if (response.success && response.data) {
        setVerification(response.data)
        if (response.data.status !== 'NOT_SUBMITTED') {
          setForm({
            fullName: response.data.fullName || '',
            phoneNumber: response.data.phoneNumber || '',
            businessName: response.data.businessName || '',
            businessType: response.data.businessType || '',
            businessReg: response.data.businessReg || '',
          })
        }
      }
    } catch (err) {
      console.error('Failed to load verification:', err)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.post<any>('/seller/verification/verify', form)
      if (response.success && response.data) {
        setVerification(response.data)
        setSuccess('Verification submitted successfully!')
        setTimeout(() => router.push('/seller/onboarding'), 1500)
      } else {
        setError(response.error || 'Failed to submit verification')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    if (!verification) return <Clock size={20} className="text-warm-800/30" />
    if (verification.status === 'APPROVED') return <CheckCircle size={20} className="text-green-500" />
    if (verification.status === 'REJECTED') return <XCircle size={20} className="text-red-500" />
    return <Clock size={20} className="text-yellow-500" />
  }

  const getStatusText = () => {
    if (!verification) return 'Not submitted'
    if (verification.status === 'APPROVED') return 'Verified'
    if (verification.status === 'REJECTED') return 'Needs attention'
    return 'Pending review'
  }

  const isLocked = verification?.status === 'APPROVED'

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Seller Verification
            </h1>
            <p className="text-warm-800/60 text-sm">Get verified to build trust with customers</p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-warm-900">Verification Status</h3>
              <p className="text-sm text-warm-800/60">{getStatusText()}</p>
            </div>
          </div>
          {verification?.rejectionReason && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {verification.rejectionReason}
            </div>
          )}
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        {!isLocked && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Your full name"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              required
            />

            <Input
              label="Phone Number"
              placeholder="+233 50 123 4567"
              value={form.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              required
            />

            <p className="text-sm text-warm-800/60 rounded-xl bg-warm-50 p-4">Seller verification uses your verified phone number and account email. No Ghana Card upload is required.</p>

            <div className="border-t border-warm-200 pt-4">
              <h3 className="font-semibold text-warm-900 mb-3">Business Information (optional)</h3>
              <div className="space-y-3">
                <Input
                  label="Business Name"
                  placeholder="Your business name"
                  value={form.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Business Type"
                    placeholder="e.g., Sole Proprietor"
                    value={form.businessType}
                    onChange={(e) => updateField('businessType', e.target.value)}
                  />
                  <Input
                    label="Business Reg. Number (optional)"
                    placeholder="e.g., GH1234567"
                    value={form.businessReg}
                    onChange={(e) => updateField('businessReg', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Verification'}
            </Button>
          </form>
        )}
      </div>
    </SellerSidebar>
  )
}
