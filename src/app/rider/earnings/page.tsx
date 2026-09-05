'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, TrendingUp, Wallet, Clock, CheckCircle, Download } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useRiderEarnings } from '@/hooks/useRider'
import { RiderLoadingState, RiderEmptyState } from '@/components/RiderAuthGuard'
import { formatCurrency } from '@/lib/rider-constants'

export default function RiderEarningsPage() {
  const router = useRouter()
  const { earnings, loading, error } = useRiderEarnings()

  if (loading) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading earnings..." />
      </RiderSidebar>
    )
  }

  if (!earnings || earnings.totalEarnings === 0) {
    return (
      <RiderSidebar>
        <Card className="p-12">
          <RiderEmptyState
            title="No earnings yet"
            description="Start accepting deliveries to earn money"
            actionLabel="Find Deliveries"
            onAction={() => router.push('/rider/deliveries/available')}
          />
        </Card>
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

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-green-500" />
              <span className="text-xs text-warm-800/60">Today's Earnings</span>
            </div>
            <p className="text-2xl font-bold text-warm-900">{formatCurrency(earnings.todayEarnings)}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-blue-500" />
              <span className="text-xs text-warm-800/60">Weekly Earnings</span>
            </div>
            <p className="text-2xl font-bold text-warm-900">{formatCurrency(earnings.weekEarnings)}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} className="text-primary" />
              <span className="text-xs text-warm-800/60">Available Balance</span>
            </div>
            <p className="text-2xl font-bold text-warm-900">{formatCurrency(earnings.availableBalance)}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-yellow-500" />
              <span className="text-xs text-warm-800/60">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold text-warm-900">{formatCurrency(earnings.totalEarnings)}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-warm-900">Earnings Breakdown</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-warm-800/60">
                Pending: {formatCurrency(earnings.pendingEarnings)}
              </span>
              <span className="text-warm-800/60">
                Withdrawn: {formatCurrency(earnings.totalWithdrawn)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {earnings.records.map((record) => {
              const isAvailable = record.status === 'AVAILABLE'
              const isPending = record.status === 'PENDING'
              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-warm-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isAvailable ? 'bg-green-100 text-green-600' : isPending ? 'bg-yellow-100 text-yellow-600' : 'bg-warm-100 text-warm-800/60'
                    }`}>
                      {isAvailable ? <CheckCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-warm-900">#{record.orderNumber}</p>
                      <p className="text-xs text-warm-800/60">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-warm-900">{formatCurrency(record.netAmount)}</p>
                    <Badge variant={isAvailable ? 'verified' : 'deal'} size="sm">
                      {record.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {earnings.pagination.totalPages > 1 && (
            <div className="mt-4 text-center text-sm text-warm-800/60">
              Page {earnings.pagination.page} of {earnings.pagination.totalPages}
            </div>
          )}

          {earnings.availableBalance > 20 && (
            <div className="mt-6 pt-4 border-t border-warm-200">
              <Button
                onClick={() => router.push('/rider/payouts')}
                icon={<Download size={18} />}
                variant="outline"
              >
                Withdraw Funds
              </Button>
            </div>
          )}
        </Card>
      </div>
    </RiderSidebar>
  )
}
