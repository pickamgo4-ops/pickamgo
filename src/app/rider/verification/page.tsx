'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Shield, Upload, FileText } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

export default function RiderVerificationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    idNumber: '',
    idType: '',
    idFrontUrl: '',
    idBackUrl: '',
    selfieUrl: '',
    businessName: '',
    businessType: '',
    businessReg: '',
  })

  useEffect(() => {
    loadVerification()
  }, [])

  const loadVerification = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/seller/verification/status')
      if (response.success && response.data) {
        setStatus(response.data.status || 'NOT_SUBMITTED')
        if (response.data.status === 'APPROVED' || response.data.status === 'PENDING' || response.data.status === 'REJECTED') {
          Object.keys(form).forEach(key => {
            if (response.data[key]) {
              setForm(prev => ({ ...prev, [key]: response.data[key] }))
            }
          })
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.post('/seller/verify', form)
      if (response.success) {
        setSuccess('Verification submitted successfully')
        setStatus('PENDING')
      } else {
        setError(response.error || 'Failed to submit verification')
      }
    } catch {
      setError('Failed to submit verification')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <RiderSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading verification status...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Verification</h1>
          <p className="text-warm-800/60 mt-1">Verify your identity to start accepting deliveries</p>
        </div>

        {status === 'APPROVED' && (
          <Card className="p-6 border-green-200 bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Verified</h3>
                <p className="text-sm text-green-700">Your identity has been verified. You can now accept deliveries.</p>
              </div>
            </div>
          </Card>
        )}

        {status === 'PENDING' && (
          <Card className="p-6 border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">Verification Pending</h3>
                <p className="text-sm text-yellow-700">Your verification is being reviewed. This usually takes 1-2 business days.</p>
              </div>
            </div>
          </Card>
        )}

        {status === 'REJECTED' && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Verification Rejected</h3>
                <p className="text-sm text-red-700">Your verification was not approved. Please try again with correct documents.</p>
              </div>
            </div>
          </Card>
        )}

        {status !== 'APPROVED' && status !== 'PENDING' && (
          <>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                {success}
              </div>
            )}

            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Submit Verification</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  required
                />
                <Input
                  label="ID Number"
                  value={form.idNumber}
                  onChange={(e) => updateField('idNumber', e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">ID Type</label>
                  <select
                    value={form.idType}
                    onChange={(e) => updateField('idType', e.target.value)}
                    className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  >
                    <option value="">Select ID type</option>
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                  </select>
                </div>
                <Input
                  label="ID Front Image URL"
                  placeholder="https://example.com/id-front.jpg"
                  value={form.idFrontUrl}
                  onChange={(e) => updateField('idFrontUrl', e.target.value)}
                  required
                />
                <Input
                  label="ID Back Image URL (optional)"
                  placeholder="https://example.com/id-back.jpg"
                  value={form.idBackUrl}
                  onChange={(e) => updateField('idBackUrl', e.target.value)}
                />
                <Input
                  label="Selfie URL (optional)"
                  placeholder="https://example.com/selfie.jpg"
                  value={form.selfieUrl}
                  onChange={(e) => updateField('selfieUrl', e.target.value)}
                />
                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </form>
            </Card>
          </>
        )}
      </div>
    </RiderSidebar>
  )
}
