'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, XCircle, DollarSign, Filter, RefreshCw } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiderDeliveryItem, RiderEarningsRecord } from '@/types/rider'
import { api } from '@/lib/api'
import { RiderLoadingState, RiderEmptyState } from '@/components/RiderAuthGuard'
import { formatCurrency } from '@/lib/rider-constants'

export default function RiderDeliveryHistoryPage() {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<RiderDeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('')
  const [pagination, setPagination] = useState<{ page: number; total: number; totalPages: number } | null>(null)

  const loadHistory = async (page = 1, status?: string) => {
    if (loading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)
    try {
      const params: any = { page, limit: 20 }
      if (status) params.status = status
      const res = await api.getRiderHistory(params)
      if (res.success && res.data) {
        setDeliveries(res.data.deliveries || [])
        setPagination({
          page: res.data.pagination?.page || 1,
          total: res.data.pagination?.total || 0,
          totalPages: res.data.pagination?.totalPages || 1,
        })
      } else {
        setError(res.error || 'Failed to load history')
      }
    } catch {
      setError('Failed to load history')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadHistory(1, filter || undefined)
  }, [filter])

  const handleViewDetails = (delivery: RiderDeliveryItem) => {
    router.push(`/rider/deliveries/${delivery.id}/details`)
  }

  const statusFilterOptions = ['', 'DELIVERED', 'CANCELLED', 'FAILED']

  if (loading) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading delivery history..." />
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Delivery History</h1>
            <p className="text-warm-800/60 mt-1">{deliveries.length} deliveries</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadHistory(1, filter || undefined)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {statusFilterOptions.map((status) => {
            const labels: Record<string, string> = { '': 'All', 'DELIVERED': 'Delivered', 'CANCELLED': 'Cancelled', 'FAILED': 'Failed' }
            return (
              <Button
                key={status}
                variant={filter === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {labels[status] || status}
              </Button>
            )
          })}
        </div>

        {deliveries.length === 0 ? (
          <Card className="p-12">
            <RiderEmptyState
              title="No deliveries yet"
              description="Your delivery history will appear here when you complete deliveries"
              actionLabel="Find Deliveries"
              onAction={() => router.push('/rider/deliveries/available')}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => {
              const isDelivered = delivery.status === 'DELIVERED'
              const isCancelled = delivery.status === 'CANCELLED' || delivery.status === 'FAILED'
              const amount = delivery.riderEarnings || (delivery.riderEarningsRecord as RiderEarningsRecord | undefined)?.netAmount || 0

              return (
                <Card
                  key={delivery.id}
                  className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => handleViewDetails(delivery)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-warm-900">
                        #{delivery.orderNumber || delivery.order?.orderNumber || delivery.orderId.slice(-6)}
                      </h3>
                      <p className="text-xs text-warm-800/60 mt-0.5">
                        {new Date(delivery.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={isDelivered ? 'verified' : isCancelled ? 'deal' : 'default'}>
                      {delivery.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-warm-800/50 uppercase tracking-wider">Pickup</p>
                        <p className="text-sm font-medium text-warm-900 truncate">{delivery.pickupAddress}</p>
                      </div>
                    </div>

                    <div className="ml-3 border-l-2 border-dashed border-warm-200 h-5" />

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-warm-800/50 uppercase tracking-wider">Dropoff</p>
                        <p className="text-sm font-medium text-warm-900 truncate">{delivery.dropoffAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-warm-200">
                    <div className="flex items-center gap-1">
                      <DollarSign size={16} className="text-green-500" />
                      <span className="font-bold text-green-600">{formatCurrency(amount)}</span>
                    </div>
                    {delivery.deliveredAt && (
                      <span className="text-xs text-warm-800/50">
                        Delivered {new Date(delivery.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </RiderSidebar>
  )
}
