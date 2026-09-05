'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, Truck, DollarSign, CheckCircle, TrendingUp, Wallet,
  Bell, MapPin, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, Star, Clock
} from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiderStatusBadge } from '@/components/RiderStatusBadge'
import { RiderDashboardData } from '@/types/rider'
import { api } from '@/lib/api'
import { RiderLoadingState, RiderEmptyState } from '@/components/RiderAuthGuard'
import { formatCurrency } from '@/lib/rider-constants'

export default function RiderDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<RiderDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  const loadDashboard = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.getRiderDashboard()
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(res.error || 'Failed to load dashboard')
      }
    } catch {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()

    const interval = setInterval(loadDashboard, 30000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  const handleToggleOnline = async () => {
    if (!data?.rider || toggling) return
    setToggling(true)
    try {
      const res = await api.patch<any>('/riders/me/status', {
        isOnline: !data.rider.isOnline,
        isAvailable: !data.rider.isOnline,
      })
      if (res.success && res.data) {
        setData(prev => prev ? {
          ...prev,
          rider: { ...prev.rider, isOnline: res.data.isOnline, isAvailable: res.data.isAvailable },
        } : null)
      } else {
        setError(res.error || 'Failed to update status')
      }
    } catch {
      setError('Failed to update status')
    } finally {
      setToggling(false)
    }
  }

  const handleAcceptDelivery = async (orderId: string) => {
    try {
      const res = await api.acceptDelivery(orderId)
      if (res.success) {
        router.push('/rider/deliveries/active')
      } else {
        setError(res.error || 'Failed to accept delivery')
      }
    } catch {
      setError('Failed to accept delivery')
    }
  }

  if (loading && !data) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading dashboard..." />
      </RiderSidebar>
    )
  }

  if (!data) {
    return (
      <RiderSidebar>
        <div className="space-y-6">
          <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">Unable to load dashboard</h3>
            <p className="text-sm text-warm-800/60 mb-4">{error || 'Something went wrong'}</p>
            <Button onClick={loadDashboard} icon={<RefreshCw size={18} />}>
              Try Again
            </Button>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  const { rider, activeDelivery, availableDeliveries } = data

  return (
    <RiderSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Rider Dashboard
          </h1>
          <p className="text-warm-800/60 mt-1">Your delivery control center</p>
        </div>

        {/* Online/Offline Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Package size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-warm-900">{rider.user.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <RiderStatusBadge rider={{
                    isOnline: rider.isOnline,
                    isAvailable: rider.isAvailable,
                    activeDelivery: activeDelivery,
                  }} />
                  {activeDelivery && (
                    <Badge variant="delivery">{activeDelivery.status}</Badge>
                  )}
                </div>
                <p className="text-sm text-warm-800/60 mt-1">
                  Rating: {rider.rating > 0 ? `${rider.rating.toFixed(1)} \u2605` : 'No ratings yet'} |
                  {rider.totalDeliveries} deliveries completed
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleOnline}
              disabled={toggling}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50`}
            >
              <span className="sr-only">Toggle online status</span>
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-1 ring-black ring-opacity-5 transition-transform ${
                  rider.isOnline ? 'translate-x-11' : 'translate-x-1'
                }`}
              />
              {rider.isOnline ? (
                <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-green-600">
                  ON
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-medium text-warm-800/50">
                  OFF
                </span>
              )}
            </button>
          </div>

          {!rider.isVerified && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Complete your verification to accept deliveries.
                  <button
                    onClick={() => router.push('/rider/verification')}
                    className="ml-1 underline hover:text-yellow-700 font-medium"
                  >
                    Verify now
                  </button>
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-blue-500" />
              <span className="text-xs text-warm-800/60">Available</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{availableDeliveries}</p>
            <p className="text-xs text-warm-800/50 mt-0.5">New requests</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={16} className="text-purple-500" />
              <span className="text-xs text-warm-800/60">Active</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{activeDelivery ? 1 : 0}</p>
            <p className="text-xs text-warm-800/50 mt-0.5">In progress</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-xs text-warm-800/60">Today</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{data.todayCompleted}</p>
            <p className="text-xs text-warm-800/50 mt-0.5">Completed</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-yellow-500" />
              <span className="text-xs text-warm-800/60">Today's Earnings</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{formatCurrency(data.todayEarnings)}</p>
            <p className="text-xs text-warm-800/50 mt-0.5">{formatCurrency(data.weekEarnings)} this week</p>
          </Card>
        </div>

        {/* Active Delivery */}
        {activeDelivery ? (
          <Card className="p-6 border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-warm-900 flex items-center gap-2">
                <Truck size={20} className="text-primary" />
                Active Delivery
              </h3>
              <Badge variant="delivery">{activeDelivery.status}</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-800/60">Order</span>
                <span className="font-medium text-warm-900">#{activeDelivery.orderNumber || activeDelivery.order?.orderNumber || '#' + activeDelivery.orderId.slice(-6)}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-warm-800/50">Pickup</p>
                  <p className="text-sm font-medium text-warm-900">{activeDelivery.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-warm-800/50">Dropoff</p>
                  <p className="text-sm font-medium text-warm-900">{activeDelivery.dropoffAddress}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-800/60">Earnings</span>
                <span className="font-bold text-green-600">{formatCurrency(activeDelivery.riderEarnings || activeDelivery.riderEarningsRecord?.netAmount || 0)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-warm-200 mt-4">
              <Button fullWidth onClick={() => router.push('/rider/deliveries/active')}>
                Go to Active Delivery
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 border-dashed border-2 border-warm-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Package size={24} className="text-warm-800/40" />
              </div>
              <h3 className="font-semibold text-warm-900 mb-2">No active delivery</h3>
              <p className="text-sm text-warm-800/60 mb-4">
                {availableDeliveries > 0
                  ? `${availableDeliveries} delivery${availableDeliveries > 1 ? 's' : ''} available for you`
                  : 'No deliveries available right now'}
              </p>
              <Button onClick={() => router.push('/rider/deliveries/available')} icon={<Package size={16} />}>
                View Available Deliveries
              </Button>
            </div>
          </Card>
        )}

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-green-500" />
              <span className="text-xs text-warm-800/60">Available Balance</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{formatCurrency(data.totalEarnings)}</p>
            <p className="text-xs text-warm-800/50 mt-0.5">{formatCurrency(data.pendingEarnings)} pending</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-blue-500" />
              <span className="text-xs text-warm-800/60">This Week</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{formatCurrency(data.weekEarnings)}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-yellow-400" />
              <span className="text-xs text-warm-800/60">Rider Rating</span>
            </div>
            <p className="text-xl font-bold text-warm-900">{rider.rating > 0 ? rider.rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-warm-800/50 mt-0.5">{rider.totalDeliveries} total deliveries</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="font-semibold text-warm-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button size="sm" variant="outline" fullWidth onClick={() => router.push('/rider/deliveries/available')} icon={<Package size={16} />}>
              Available
            </Button>
            <Button size="sm" variant="outline" fullWidth onClick={() => router.push('/rider/deliveries/history')} icon={<Clock size={16} />}>
              History
            </Button>
            <Button size="sm" variant="outline" fullWidth onClick={() => router.push('/rider/earnings')} icon={<Wallet size={16} />}>
              Earnings
            </Button>
            <Button size="sm" variant="outline" fullWidth onClick={() => router.push('/rider/payouts')} icon={<DollarSign size={16} />}>
              Payouts
            </Button>
          </div>
        </Card>
      </div>
    </RiderSidebar>
  )
}
