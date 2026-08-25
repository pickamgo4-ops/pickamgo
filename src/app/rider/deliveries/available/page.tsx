'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, MapPin, DollarSign, Clock, CheckCircle, Navigation } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
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
}

export default function RiderAvailableDeliveriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadDeliveries()
  }, [])

  const loadDeliveries = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/riders/deliveries')
      if (response.success && response.data) {
        setDeliveries(response.data.availableDeliveries || [])
      }
    } catch {
      setError('Failed to load deliveries')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (orderId: string) => {
    try {
      const response = await api.post(`/riders/deliveries/${orderId}/accept`, {})
      if (response.success) {
        router.push('/rider/deliveries/active')
      } else {
        setError(response.error || 'Failed to accept delivery')
      }
    } catch {
      setError('Failed to accept delivery')
    }
  }

  if (loading) {
    return (
      <RiderSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading deliveries...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Available Deliveries</h1>
          <p className="text-warm-800/60 mt-1">{deliveries.length} deliveries available</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {deliveries.length === 0 ? (
          <Card className="p-12 text-center">
            <Package size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No deliveries available</h3>
            <p className="text-sm text-warm-800/60">Check back later for new delivery requests</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <Card key={delivery.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-warm-900">#{delivery.orderNumber || delivery.orderId?.slice(-6)}</h3>
                    <p className="text-xs text-warm-800/60 mt-1">
                      {new Date(delivery.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="delivery">{delivery.status}</Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-warm-800/60">Pickup</p>
                      <p className="text-sm font-medium text-warm-900">{delivery.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin size={16} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-warm-800/60">Dropoff</p>
                      <p className="text-sm font-medium text-warm-900">{delivery.dropoffAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-warm-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-warm-800/70">
                      <DollarSign size={16} className="text-green-500" />
                      <span className="font-bold text-green-600">GH₵{delivery.riderEarnings?.toFixed(2) || '0.00'}</span>
                    </div>
                    {delivery.distance && (
                      <div className="flex items-center gap-1 text-sm text-warm-800/70">
                        <Navigation size={16} className="text-warm-800/50" />
                        <span>{delivery.distance}</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => handleAccept(delivery.orderId)}>
                    Accept
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RiderSidebar>
  )
}
