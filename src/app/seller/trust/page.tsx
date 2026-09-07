'use client'

import React, { useState, useEffect } from 'react'
import { Shield, TrendingUp, AlertTriangle, Clock, CheckCircle, History, DollarSign, Lock } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { SellerTrustInfo, SellerRisk, SellerPayoutFreeze } from '@/types'

export default function SellerTrustPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trustInfo, setTrustInfo] = useState<SellerTrustInfo | null>(null)

  useEffect(() => {
    loadTrustInfo()
  }, [])

  const loadTrustInfo = async () => {
    try {
      const response = await api.get<SellerTrustInfo>('/seller/trust')
      if (response.success && response.data) {
        setTrustInfo(response.data)
      } else {
        setError(response.error || 'Failed to load trust info')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getTrustScoreBg = (score: number) => {
    if (score >= 75) return 'bg-green-500'
    if (score >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Trust Center
            </h1>
            <p className="text-warm-800/60 text-sm">View your trust score, risk level, and account restrictions</p>
          </div>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border border-red-200 text-red-700">
            {error}
          </Card>
        )}

        {trustInfo && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={20} className="text-warm-800/50" />
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Trust Score</label>
                </div>
                <div className="flex items-end gap-3">
                  <p className={`text-4xl font-bold ${getTrustScoreColor(trustInfo.trustScore)}`}>
                    {trustInfo.trustScore}/100
                  </p>
                  <div className="w-16 h-3 bg-warm-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${getTrustScoreBg(trustInfo.trustScore)}`} style={{ width: `${trustInfo.trustScore}%` }} />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle size={20} className="text-warm-800/50" />
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Risk Level</label>
                </div>
                <Badge className={getRiskColor(trustInfo.riskLevel)}>
                  {trustInfo.riskLevel}
                </Badge>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield size={20} className="text-warm-800/50" />
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Verification</label>
                </div>
                <Badge variant={trustInfo.verificationStatus === 'APPROVED' ? 'verified' : trustInfo.verificationStatus === 'PENDING' ? 'delivery' : 'default'}>
                  {trustInfo.verificationStatus === 'APPROVED' ? 'Verified' : trustInfo.verificationStatus === 'PENDING' ? 'Pending' : trustInfo.verificationStatus === 'SUSPENDED' ? 'Suspended' : 'Not submitted'}
                </Badge>
                {trustInfo.reviewStatus && (
                  <div className="mt-2">
                    <Badge variant="default" className="text-xs">
                      Review: {trustInfo.reviewStatus}
                    </Badge>
                  </div>
                )}
              </Card>
            </div>

            {trustInfo.isPayoutFrozen && (
              <Card className="p-4 bg-red-50 border border-red-200">
                <div className="flex items-center gap-3">
                  <Lock size={20} className="text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">Payouts are frozen</h3>
                    <p className="text-sm text-red-700">{trustInfo.payoutFreezeReason || 'Payouts have been frozen for security reasons.'}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-warm-800">Can sell on PickAmGo</span>
                  {trustInfo.canSell ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={18} className="text-orange-500" />
                  )}
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-warm-800">Seller verification</span>
                  {trustInfo.verificationStatus === 'APPROVED' ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : trustInfo.verificationStatus === 'SUSPENDED' ? (
                    <AlertTriangle size={18} className="text-red-500" />
                  ) : (
                    <Clock size={18} className="text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-warm-800">Payout status</span>
                  {trustInfo.isPayoutFrozen ? (
                    <Lock size={18} className="text-red-500" />
                  ) : (
                    <CheckCircle size={18} className="text-green-500" />
                  )}
                </div>
              </div>
            </Card>

            {trustInfo.restrictions.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-warm-900 mb-4">Restrictions &amp; Notes</h3>
                <ul className="space-y-2">
                  {trustInfo.restrictions.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-warm-800/70">
                      <AlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {trustInfo.verificationMethod && (
              <Card className="p-6">
                <h3 className="font-semibold text-warm-900 mb-3">Verification Method</h3>
                <div className="text-sm text-warm-800/70 space-y-1">
                  <p><span className="font-medium text-warm-900">Method:</span> {trustInfo.verificationMethod}</p>
                  {trustInfo.verificationProvider && <p><span className="font-medium text-warm-900">Provider:</span> {trustInfo.verificationProvider}</p>}
                  {trustInfo.verificationDate && <p><span className="font-medium text-warm-900">Date:</span> {new Date(trustInfo.verificationDate).toLocaleDateString()}</p>}
                </div>
              </Card>
            )}
          </>
        )}

        {!trustInfo && !loading && !error && (
          <Card className="p-12 text-center">
            <Shield size={44} className="mx-auto text-warm-800/30 mb-3" />
            <p className="text-warm-800/60">No trust information available. Complete verification to improve your trust score.</p>
          </Card>
        )}
      </div>
    </SellerSidebar>
  )
}
