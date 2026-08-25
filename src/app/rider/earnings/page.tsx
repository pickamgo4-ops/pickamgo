'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, TrendingUp, Wallet, Clock, CheckCircle } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function RiderEarningsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [earnings, setEarnings] = useState<any>(null)

  useEffect(() => {
    loadEarnings()
  }, [])

  const loadEarnings = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/riders/earnings')
      if (response.success && response.data) {
        setEarnings(response.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <RiderSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading earnings...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Earnings</h1>
          <p className="text-warm-800/60 mt-1">Track your delivery earnings</p>
        </div>

        {!earnings || earnings.totalDeliveries === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No earnings yet</h3>
            <p className="text-sm text-warm-800/60">Start accepting deliveries to earn money</p>
            <Button className="mt-4" onClick={() => router.push('/rider/deliveries/available')}>
              Find Deliveries
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={18} className="text-green-500" />
                  <span className="text-xs text-warm-800/60">Today's Earnings</span>
                </div>
                <p className="text-2xl font-bold text-warm-900">GH₵{earnings.todayEarnings?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-warm-800/50 mt-1">{earnings.todayDeliveries || 0} deliveries</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  <span className="text-xs text-warm-800/60">Weekly Earnings</span>
                </div>
                <p className="text-2xl font-bold text-warm-900">GH₵{earnings.weekEarnings?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-warm-800/50 mt-1">{earnings.weekDeliveries || 0} deliveries</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={18} className="text-primary" />
                  <span className="text-xs text-warm-800/60">Total Earnings</span>
                </div>
                <p className="text-2xl font-bold text-warm-900">GH₵{earnings.totalEarnings?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-warm-800/50 mt-1">{earnings.totalDeliveries || 0} total deliveries</p>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-900">Pending Earnings</h3>
                <span className="text-sm text-warm-800/60">
                  {earnings.pendingEarnings > 0 ? (
                    <span className="text-yellow-600 font-medium">GH₵{earnings.pendingEarnings?.toFixed(2)} pending</span>
                  ) : (
                    'No pending earnings'
                  )}
                </span>
              </div>
              <div className="w-full bg-warm-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{
                    width: earnings.totalEarnings > 0
                      ? `${((earnings.totalEarnings - earnings.pendingEarnings) / earnings.totalEarnings) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-xs text-warm-800/50 mt-2">
                {earnings.totalDeliveries || 0} completed deliveries
              </p>
            </Card>
          </>
        )}
      </div>
    </RiderSidebar>
  )
}
