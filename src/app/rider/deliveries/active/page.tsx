'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, DollarSign, Clock, Navigation, Package, CheckCircle, Truck, MessageCircle } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'

const GoogleMap = dynamic(() => import('@/components/map/GoogleMap'), { ssr: false })

interface Delivery {
  id: string
  orderId: string
  orderNumber?: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropoffLatitude?: number | null
  dropoffLongitude?: number | null
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
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  const handleCurrentLocation = async (location: { latitude: number; longitude: number }) => {
    setCurrentLocation(location)
    await api.patch('/riders/me/location', location)
  }

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
  const pickup = delivery.pickupLatitude != null && delivery.pickupLongitude != null
    ? { latitude: delivery.pickupLatitude, longitude: delivery.pickupLongitude }
    : null
  const dropoff = delivery.dropoffLatitude != null && delivery.dropoffLongitude != null
    ? { latitude: delivery.dropoffLatitude, longitude: delivery.dropoffLongitude }
    : null
  const mapMarkers = [
    pickup && { ...pickup, label: `PICKUP - ${delivery.pickupAddress}`, color: '#16a34a' },
    dropoff && { ...dropoff, label: `DELIVERY - ${delivery.dropoffAddress}`, color: '#dc2626' },
    currentLocation && { ...currentLocation, label: 'Rider current location', color: '#2563eb' },
  ].filter(Boolean) as { latitude: number; longitude: number; label: string; color: string }[]

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

        {pickup && dropoff ? (
          <Card className="p-4 sm:p-6">
            <h2 className="font-semibold text-warm-900 mb-1">Delivery route</h2>
            <p className="text-sm text-warm-800/60 mb-4">Pickup to customer delivery route</p>
            <GoogleMap
              markers={mapMarkers}
              route={{ from: pickup, to: dropoff }}
              height="320px"
              showCurrentLocation
              onCurrentLocation={handleCurrentLocation}
              onRouteInfo={setRouteInfo}
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-warm-50 p-3"><p className="text-xs text-warm-800/60">Distance</p><p className="font-semibold text-warm-900">{routeInfo?.distance || 'Calculating...'}</p></div>
              <div className="rounded-xl bg-warm-50 p-3"><p className="text-xs text-warm-800/60">ETA</p><p className="font-semibold text-warm-900">{routeInfo?.duration || 'Calculating...'}</p></div>
            </div>
          </Card>
        ) : (
          <Card className="p-4"><p className="text-sm text-warm-800/60">Map unavailable because pickup or delivery coordinates are missing.</p></Card>
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
              {delivery.order?.customer?.id && (
                <Button fullWidth variant="outline" onClick={() => router.push(`/messages/${delivery.order.customer.id}?orderId=${delivery.orderId}`)} icon={<MessageCircle size={18} />}>
                  Message Customer
                </Button>
              )}
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
