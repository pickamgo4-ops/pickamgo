'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, DollarSign, Clock, Navigation, Package, CheckCircle, Truck } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

interface Delivery {
  id: string
  orderId: string
  orderNumber?: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  riderEarnings: number
  distance?: string
  createdAt: string
  order?: any
}

export default function RiderActiveDeliveryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadActiveDelivery()
  }, [])

  const loadActiveDelivery = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/riders/deliveries')
      if (response.success && response.data) {
        setDelivery(response.data.activeDelivery || null)
      }
    } catch {
      setError('Failed to load active delivery')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status: string) => {
    if (!delivery) return
    try {
      const response = await api.patch(`/riders/deliveries/${delivery.id}/status`, { status })
      if (response.success) {
        setDelivery({ ...delivery, status })
        if (status === 'DELIVERED') {
          router.push('/rider')
        }
      } else {
        setError(response.error || 'Failed to update status')
      }
    } catch {
      setError('Failed to update status')
    }
  }

  const getNextAction = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'ACCEPTED': return 'ARRIVED_AT_PICKUP'
      case 'ARRIVED_AT_PICKUP': return 'PICKED_UP'
      case 'PICKED_UP': return 'OUT_FOR_DELIVERY'
      case 'OUT_FOR_DELIVERY': return 'DELIVERED'
      default: return null
    }
  }

  const actionLabels: Record<string, string> = {
    ARRIVED_AT_PICKUP: 'Arrived at Pickup',
    PICKED_UP: 'Picked Up',
    OUT_FOR_DELIVERY: 'Start Delivery',
    DELIVERED: 'Mark as Delivered',
  }

  if (loading) {
    return (
      <RiderSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading active delivery...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  if (!delivery) {
    return (
      <RiderSidebar>
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">No active delivery</h3>
          <p className="text-sm text-warm-800/60 mb-4">Accept a delivery to get started</p>
          <Button onClick={() => router.push('/rider/deliveries/available')}>
            Find Deliveries
          </Button>
        </div>
      </RiderSidebar>
    )
  }

  const nextAction = getNextAction(delivery.status)

  return (
    <RiderSidebar>
      <div className="space-y-6 max-w-2xl mx-auto w-full min-w-0">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Active Delivery</h1>
          <p className="text-warm-800/60 mt-1">#{delivery.orderNumber || delivery.orderId?.slice(-6)}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

          <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <Badge variant="delivery">{delivery.status}</Badge>
            <span className="text-sm text-warm-800/60">
              Started {new Date(delivery.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-warm-800/60 uppercase tracking-wider mb-1">Pickup Location</p>
                <p className="font-medium text-warm-900">{delivery.pickupAddress}</p>
              </div>
            </div>

            <div className="ml-6 border-l-2 border-dashed border-warm-300 h-8" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-warm-800/60 uppercase tracking-wider mb-1">Dropoff Location</p>
                <p className="font-medium text-warm-900">{delivery.dropoffAddress}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-warm-50 rounded-xl">
              <p className="text-xs text-warm-800/60 mb-1">Earnings</p>
              <p className="text-xl font-bold text-green-600">GH₵{delivery.riderEarnings?.toFixed(2) || '0.00'}</p>
            </div>
            {delivery.distance && (
              <div className="p-4 bg-warm-50 rounded-xl">
                <p className="text-xs text-warm-800/60 mb-1">Distance</p>
                <p className="text-xl font-bold text-warm-900">{delivery.distance}</p>
              </div>
            )}
          </div>

          {nextAction && (
            <div className="flex flex-col gap-3 pt-4 border-t border-warm-200">
              <Button fullWidth onClick={() => handleStatusUpdate(nextAction)} icon={nextAction === 'DELIVERED' ? <CheckCircle size={18} /> : undefined}>
                {actionLabels[nextAction]}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </RiderSidebar>
  )
}
