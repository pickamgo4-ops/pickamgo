'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Truck, DollarSign, Bell, User, Settings, HelpCircle, Clock, CheckCircle, ChevronLeft } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

export default function RiderDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    availableDeliveries: 0,
    activeDelivery: null as any,
    todayCompleted: 0,
    todayEarnings: 0,
    weekEarnings: 0,
    totalEarnings: 0,
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [deliveriesRes, earningsRes] = await Promise.all([
        api.get<any>('/riders/deliveries'),
        api.get<any>('/riders/earnings'),
      ])

      if (deliveriesRes.success && deliveriesRes.data) {
        const data = deliveriesRes.data
        setStats(prev => ({
          ...prev,
          availableDeliveries: data.availableDeliveries?.length || 0,
          activeDelivery: data.activeDelivery || null,
        }))
      }

      if (earningsRes.success && earningsRes.data) {
        const data = earningsRes.data
        setStats(prev => ({
          ...prev,
          todayCompleted: data.todayDeliveries || 0,
          todayEarnings: data.todayEarnings || 0,
          weekEarnings: data.weekEarnings || 0,
          totalEarnings: data.totalEarnings || 0,
        }))
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
            <p className="text-warm-800/60">Loading dashboard...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Rider
          </h1>
          <p className="text-warm-800/60 mt-1">Here's your delivery overview</p>
        </div>

        {stats.availableDeliveries === 0 && !stats.activeDelivery ? (
          <Card className="p-12 text-center">
            <Package size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No deliveries available right now</h3>
            <p className="text-sm text-warm-800/60">New delivery requests will appear here</p>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} className="text-primary" />
                  <span className="text-xs text-warm-800/60">Available</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.availableDeliveries}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck size={16} className="text-orange-500" />
                  <span className="text-xs text-warm-800/60">Active</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.activeDelivery ? 1 : 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-xs text-warm-800/60">Today's Deliveries</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.todayCompleted}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-yellow-500" />
                  <span className="text-xs text-warm-800/60">Today's Earnings</span>
                </div>
                <p className="text-xl font-bold text-warm-900">GH₵{stats.todayEarnings.toFixed(2)}</p>
              </Card>
            </div>

            {/* Active Delivery */}
            {stats.activeDelivery && (
              <Card className="p-6 border-primary/30">
                <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                  <Truck size={20} className="text-primary" />
                  Active Delivery
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-800/60">Order</span>
                    <span className="font-medium text-warm-900">#{stats.activeDelivery.order?.orderNumber || stats.activeDelivery.orderId?.slice(-6)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-800/60">Pickup</span>
                    <span className="font-medium text-warm-900">{stats.activeDelivery.pickupAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-800/60">Dropoff</span>
                    <span className="font-medium text-warm-900">{stats.activeDelivery.dropoffAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warm-800/60">Earning</span>
                    <span className="font-bold text-green-600">GH₵{stats.activeDelivery.riderEarnings?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="pt-3 border-t border-warm-200">
                    <Button fullWidth onClick={() => router.push('/rider/deliveries/active')}>
                      View Active Delivery
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </RiderSidebar>
  )
}
