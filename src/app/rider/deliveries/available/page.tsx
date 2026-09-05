'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, MapPin, DollarSign, Navigation, Clock, CheckCircle,
  RefreshCw, Filter
} from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiderDeliveryItem } from '@/types/rider'
import { api } from '@/lib/api'
import { RiderLoadingState, RiderEmptyState } from '@/components/RiderAuthGuard'
import { formatCurrency } from '@/lib/rider-constants'
import dynamic from 'next/dynamic'

const RiderMiniMap = dynamic(() => import('@/components/RiderMiniMap'), { ssr: false })

interface AvailableDeliveriesResponse {
  availableDeliveries: RiderDeliveryItem[]
}

export default function RiderAvailableDeliveriesPage() {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<RiderDeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const loadDeliveries = async () => {
    setError(null)
    if (loading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    try {
      const res = await api.get<AvailableDeliveriesResponse>('/riders/deliveries')
      if (res.success && res.data) {
        setDeliveries(res.data.availableDeliveries || [])
      } else {
        setError(res.error || 'Failed to load deliveries')
      }
    } catch {
      setError('Failed to load deliveries')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDeliveries()

    const interval = setInterval(() => {
      loadDeliveries()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleAccept = async (orderId: string) => {
    if (acceptingId) return
    setAcceptingId(orderId)
    try {
      const res = await api.acceptDelivery(orderId)
      if (res.success) {
        router.push('/rider/deliveries/active')
      } else {
        setError(res.error || 'Failed to accept delivery')
      }
    } catch {
      setError('Failed to accept delivery')
    } finally {
      setAcceptingId(null)
    }
  }

  const handleViewDetails = (delivery: RiderDeliveryItem) => {
    router.push(`/rider/deliveries/${delivery.id}/details`)
  }

  if (loading) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading available deliveries..." />
      </RiderSidebar>
    )
  }

  if (error && !deliveries.length) {
    return (
      <RiderSidebar>
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
          <Button onClick={loadDeliveries} icon={<RefreshCw size={16} />}>
            Try Again
          </Button>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Available Deliveries
            </h1>
            <p className="text-warm-800/60 mt-1">
              {deliveries.length} delivery{deliveries.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            onClick={loadDeliveries}
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

        {deliveries.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={36} className="text-warm-800/30" />
            </div>
            <h3 className="font-display text-lg font-semibold text-warm-900 mb-2">
              No deliveries available right now
            </h3>
            <p className="text-sm text-warm-800/60">
              New delivery requests will appear here when they are available in your area.
            </p>
            <p className="text-sm text-warm-800/60 mt-2">
              Make sure you are online and in an accepted area to receive requests.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <DeliveryRequestCard
                key={delivery.id}
                delivery={delivery}
                onAccept={handleAccept}
                onViewDetails={handleViewDetails}
                accepting={acceptingId === delivery.orderId}
              />
            ))}
          </div>
        )}
      </div>
    </RiderSidebar>
  )
}

function DeliveryRequestCard({
  delivery,
  onAccept,
  onViewDetails,
  accepting,
}: {
  delivery: RiderDeliveryItem
  onAccept: (orderId: string) => void
  onViewDetails: (delivery: RiderDeliveryItem) => void
  accepting: boolean
}) {
  const order = delivery.order
  const items = order?.items || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pickup = delivery.pickupLatitude != null && delivery.pickupLongitude != null
    ? { lat: delivery.pickupLatitude, lng: delivery.pickupLongitude }
    : order?.shop && order.shop.latitude != null && order.shop.longitude != null
    ? { lat: order.shop.latitude, lng: order.shop.longitude }
    : null
  const dropoff = delivery.dropoffLatitude != null && delivery.dropoffLongitude != null
    ? { lat: delivery.dropoffLatitude, lng: delivery.dropoffLongitude }
    : null
  const createdAt = delivery.createdAt
  const waitingMinutes = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    : 0

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-warm-900">
            #{delivery.orderNumber || order?.orderNumber || delivery.orderId.slice(-6)}
          </h3>
          <p className="text-xs text-warm-800/60 mt-0.5">
            Waiting {waitingMinutes > 0 ? `${waitingMinutes}m` : '< 1m'}
          </p>
        </div>
        <Badge variant="delivery">{delivery.status}</Badge>
      </div>

      {/* Route Info */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={16} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-warm-800/50 uppercase tracking-wider">Pickup</p>
                  <p className="text-sm font-medium text-warm-900 truncate">
                    {delivery.pickupAddress}
            </p>
          </div>
          <div className="text-xs text-warm-800/50 whitespace-nowrap">
            {delivery.distance || '—'}
          </div>
        </div>

        <div className="ml-4 border-l-2 border-dashed border-warm-200 h-6" />

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={16} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-warm-800/50 uppercase tracking-wider">Dropoff</p>
            <p className="text-sm font-medium text-warm-900 truncate">
              {delivery.dropoffAddress}
            </p>
            {order?.customer && (
              <p className="text-xs text-warm-800/60">{order.customer.name || order.customer.location}</p>
            )}
          </div>
        </div>
      </div>

      {/* Map preview if coordinates available */}
      {pickup && dropoff && (
        <div className="mb-4 rounded-xl overflow-hidden border border-warm-200 h-32">
          <RiderMiniMap
            pickup={pickup}
            dropoff={dropoff}
            height="128px"
          />
        </div>
      )}

      {/* Order Summary */}
      <div className="space-y-3 pt-3 border-t border-warm-200 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Package size={14} className="text-warm-800/50" />
          <span className="text-warm-800/70">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          {items.length > 0 && (
            <span className="text-warm-800/50">•</span>
          )}
          {items.slice(0, 2).map((item, i) => (
            <span key={i} className="text-warm-800/70">
              {item.name}
              {i < items.slice(0, 2).length - 1 && ', '}
            </span>
          ))}
          {items.length > 2 && <span className="text-warm-800/50">+{items.length - 2} more</span>}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Navigation size={14} className="text-warm-800/50" />
          <span className="text-warm-800/70">
            {delivery.distance || 'Distance not available'}
          </span>
        </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-warm-800/50" />
            <span className="text-warm-800/70">
              {delivery.estimatedTime || 'Est. time not available'}
            </span>
          </div>
      </div>

      {/* Earnings and Payment */}
      <div className="flex items-center justify-between pt-3 border-t border-warm-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <DollarSign size={16} className="text-green-500" />
            <span className="font-bold text-green-600">{formatCurrency(delivery.riderEarnings || 0)}</span>
          </div>
          {order?.payment && (
            <Badge variant={order.payment.status === 'PAID' ? 'verified' : 'deal'}>
              {order.payment.status}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
      {/* View Details button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(delivery)}
          >
            View Details
          </Button>
          <Button
            size="sm"
            loading={accepting}
            onClick={() => onAccept(delivery.orderId)}
            disabled={accepting}
          >
            {accepting ? 'Accepting...' : 'Accept'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
