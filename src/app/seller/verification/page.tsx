'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CheckCircle, Clock, XCircle, Shield, TrendingUp, AlertTriangle, History, User } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { VerificationStatus } from '@/types'

interface VerificationData {
  id: string
  type?: string | null
  phoneNumber?: string | null
  status: VerificationStatus
  reviewStatus?: string | null
  sellerType?: string | null
  businessName?: string | null
  businessDescription?: string | null
  businessType?: string | null
  businessReg?: string | null
  location?: string | null
  intendedSell?: string | null
  agreedToTerms: boolean
  agreedAt?: string | null
  verificationMethod?: string | null
  verificationProvider?: string | null
  verificationReference?: string | null
  verificationDate?: string | null
  rejectionReason?: string | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt: string
}

interface RiskData {
  riskLevel: string
  trustScore: number
  lastCheckedAt: string
  flags?: string | null
}

interface HistoryEntry {
  id: string
  statusFrom?: string | null
  statusTo: string
  reason?: string | null
  changedBy?: string | null
  createdAt: string
}

export default function SellerVerificationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verification, setVerification] = useState<VerificationData | null>(null)
  const [risk, setRisk] = useState<RiskData | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeTab, setActiveTab] = useState<'form' | 'status'>('form')

  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    businessName: '',
    businessType: '',
    businessReg: '',
    businessDescription: '',
    location: '',
    intendedSell: '',
    sellerType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    agreedToTerms: false,
    agreedAt: '',
  })

  useEffect(() => {
    loadVerification()
  }, [])

  const loadVerification = async () => {
    try {
      const response = await api.get<any>('/seller/verification/status')
      if (response.success && response.data) {
        if (response.data.status === 'NOT_SUBMITTED') {
          setVerification(null)
        } else {
          setVerification(response.data.verification || null)
          setRisk(response.data.risk || null)
          if (response.data.verification) {
            const v = response.data.verification
            setForm({
              fullName: v.fullName || '',
              phoneNumber: v.phoneNumber || '',
              businessName: v.businessName || '',
              businessType: v.businessType || '',
              businessReg: v.businessReg || '',
              businessDescription: v.businessDescription || '',
              location: v.location || '',
              intendedSell: v.intendedSell || '',
              sellerType: v.sellerType || 'INDIVIDUAL',
              agreedToTerms: v.agreedToTerms || false,
              agreedAt: v.agreedAt || '',
            })
          }
        }
      }

      const histResponse = await api.get<HistoryEntry[]>('/seller/verification/history')
      if (histResponse.success && histResponse.data) {
        setHistory(histResponse.data)
      }
    } catch (err) {
      console.error('Failed to load verification:', err)
    }
  }

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!form.agreedToTerms) {
      setError('You must agree to the terms to submit verification')
      setLoading(false)
      return
    }

    try {
      const response = await api.post<any>('/seller/verification/verify', {
        ...form,
        agreedAt: new Date().toISOString(),
      })
      if (response.success && response.data) {
        setVerification(response.data)
        setSuccess(response.data.status === 'APPROVED' ? 'Verification auto-approved! You can now sell.' : 'Verification submitted successfully!')
        setTimeout(() => router.push('/seller/onboarding'), 2000)
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
    if (verification.status === 'SUSPENDED') return <Shield size={20} className="text-orange-500" />
    return <Clock size={20} className="text-yellow-500" />
  }

  const getStatusText = () => {
    if (!verification) return 'Not submitted'
    if (verification.status === 'APPROVED') return 'Verified'
    if (verification.status === 'REJECTED') return 'Needs attention'
    if (verification.status === 'SUSPENDED') return 'Suspended'
    return 'Pending review'
  }

  const isLocked = verification?.status === 'APPROVED'

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-600 bg-red-50'
      case 'MEDIUM': return 'text-orange-600 bg-orange-50'
      case 'LOW': return 'text-blue-600 bg-blue-50'
      default: return 'text-green-600 bg-green-50'
    }
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

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

        <div className="flex items-center gap-4 border-b border-warm-200">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'form' ? 'text-primary border-b-2 border-primary' : 'text-warm-800/60 hover:text-warm-900'}`}
          >
            Verification Form
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'status' ? 'text-primary border-b-2 border-primary' : 'text-warm-800/60 hover:text-warm-900'}`}
          >
            Status & Trust
          </button>
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
          {verification?.reviewStatus && (
            <div className="mt-2">
              <Badge variant={verification.reviewStatus === 'AUTO_APPROVED' ? 'verified' : verification.reviewStatus === 'NEEDS_REVIEW' ? 'default' : 'delivery'}>
                Review: {verification.reviewStatus}
              </Badge>
            </div>
          )}
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

        {activeTab === 'status' && (
          <div className="space-y-4">
            {verification && (
              <>
                <Card className="p-6">
                  <h3 className="font-semibold text-warm-900 mb-4">Verification Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-warm-800/50">Type</span>
                      <span className="font-medium text-warm-900 ml-2">{verification.type || 'SELLER'}</span>
                    </div>
                    <div>
                      <span className="text-warm-800/50">Seller Type</span>
                      <span className="font-medium text-warm-900 ml-2">{verification.sellerType || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-warm-800/50">Business</span>
                      <span className="font-medium text-warm-900 ml-2">{verification.businessName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-warm-800/50">Phone</span>
                      <span className="font-medium text-warm-900 ml-2">{verification.phoneNumber}</span>
                    </div>
                    <div>
                      <span className="text-warm-800/50">Submitted</span>
                      <span className="font-medium text-warm-900 ml-2">{new Date(verification.createdAt).toLocaleDateString()}</span>
                    </div>
                    {verification.reviewedAt && (
                      <div>
                        <span className="text-warm-800/50">Reviewed</span>
                        <span className="font-medium text-warm-900 ml-2">{new Date(verification.reviewedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {risk && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4">Trust &amp; Risk</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Trust Score</label>
                        <p className={`text-3xl font-bold mt-1 ${getTrustScoreColor(risk.trustScore)}`}>{risk.trustScore}/100</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Risk Level</label>
                        <div className={`mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk.riskLevel)}`}>
                          <Shield size={14} />
                          {risk.riskLevel}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Last Checked</label>
                        <p className="text-sm text-warm-900 mt-1">{new Date(risk.lastCheckedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {risk.flags && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-warm-800/50 uppercase mb-2 block">Risk Flags</label>
                        <pre className="text-xs text-warm-800/70 bg-warm-50 p-3 rounded-xl overflow-x-auto">
                          {risk.flags}
                        </pre>
                      </div>
                    )}
                  </Card>
                )}

                {history.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                      <History size={16} />
                      Verification History
                    </h3>
                    <div className="space-y-3">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between py-2 border-b border-warm-200 last:border-0">
                          <div>
                            <span className="font-medium text-warm-900">{h.statusFrom || 'NEW'}</span>
                            <span className="text-warm-800/50 mx-2">→</span>
                            <span className="font-medium text-warm-900">{h.statusTo}</span>
                            {h.reason && <span className="text-warm-800/50"> — {h.reason}</span>}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-warm-800/50">{new Date(h.createdAt).toLocaleString()}</span>
                            {h.changedBy && <div className="text-xs text-warm-800/40">by {h.changedBy === 'system' ? 'System' : h.changedBy}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {!verification && (
              <Card className="p-12 text-center">
                <Clock size={44} className="mx-auto text-warm-800/30 mb-3" />
                <p className="text-warm-800/60">No verification has been submitted yet.</p>
                <Button onClick={() => setActiveTab('form')} className="mt-4">Submit Verification</Button>
              </Card>
            )}
          </div>
        )}

        {(activeTab === 'form' || !verification) && (
          <>
            {!isLocked && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-t border-warm-200 pt-4">
                  <h3 className="font-semibold text-warm-900 mb-3">Account Information</h3>
                  <div className="space-y-3">
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
                  </div>
                </div>

                <div className="border-t border-warm-200 pt-4">
                  <h3 className="font-semibold text-warm-900 mb-3">Business Details</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="sellerType"
                          value="INDIVIDUAL"
                          checked={form.sellerType === 'INDIVIDUAL'}
                          onChange={() => updateField('sellerType', 'INDIVIDUAL')}
                          className="text-primary focus:ring-primary"
                        />
                        Individual
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="sellerType"
                          value="BUSINESS"
                          checked={form.sellerType === 'BUSINESS'}
                          onChange={() => updateField('sellerType', 'BUSINESS')}
                          className="text-primary focus:ring-primary"
                        />
                        Business
                      </label>
                    </div>

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
                    <Input
                      label="Business Description"
                      placeholder="Tell us about your business..."
                      value={form.businessDescription}
                      onChange={(e) => updateField('businessDescription', e.target.value)}
                    />
                    <Input
                      label="Location"
                      placeholder="Your business location"
                      value={form.location}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
                    <Input
                      label="What will you sell?"
                      placeholder="Describe your products or services"
                      value={form.intendedSell}
                      onChange={(e) => updateField('intendedSell', e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t border-warm-200 pt-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.agreedToTerms}
                      onChange={(e) => updateField('agreedToTerms', e.target.checked)}
                      className="mt-1 text-primary focus:ring-primary rounded"
                      required
                    />
                    <span className="text-sm text-warm-800">
                      I have read and agreed to the <a href="/terms" className="text-primary underline" target="_blank">Terms of Service</a> and <a href="/privacy" className="text-primary underline" target="_blank">Privacy Policy</a>. I confirm that the information provided is true and accurate.
                    </span>
                  </label>
                </div>

                <p className="text-sm text-warm-800/60 rounded-xl bg-warm-50 p-4">Seller verification uses your verified phone number and account email. No Ghana Card upload is required. Your phone number must be verified before submitting.</p>

                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </form>
            )}

            {isLocked && (
              <Card className="p-6">
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle size={24} />
                  <div>
                    <h3 className="font-semibold text-warm-900">Your account is verified</h3>
                    <p className="text-sm text-warm-800/60">You can now sell on PickAmGo. You may update your verification information by contacting support.</p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </SellerSidebar>
  )
}
