'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, DollarSign, Clock, Package, Navigation, Truck, CheckCircle } from 'lucide-react'
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

interface Props {
  params: Promise<{ id: string }>
}

export default function DeliveryDetailsPage({ params }: Props) {
  const router = useRouter()
  const { id } = use(params) as { id: string }
  const [delivery, setDelivery] = useState<RiderDeliveryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadDelivery = async () => {
    if (!id) return
    setError(null)
    setLoading(true)
    try {
      const res = await api.get<RiderDeliveryItem>(`/riders/deliveries/${id}`)
      if (res.success && res.data) {
        setDelivery(res.data)
      } else {
        setError(res.error || 'Delivery not found')
      }
    } catch {
      setError('Failed to load delivery')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDelivery()
  }, [id])

  const handleAccept = async () => {
    if (!delivery) return
    setActionLoading(true)
    try {
      const res = await api.post(`/riders/deliveries/${delivery.orderId}/accept`, {})
      if (res.success) {
        router.push('/rider/deliveries/active')
      } else {
        setError(res.error || 'Failed to accept delivery')
      }
    } catch {
      setError('Failed to accept delivery')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading delivery details..." />
      </RiderSidebar>
    )
  }

  if (!delivery) {
    return (
      <RiderSidebar>
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">Delivery not found</h3>
          <p className="text-sm text-warm-800/60 mb-4">{error || 'The requested delivery could not be loaded.'}</p>
          <Button onClick={() => router.push('/rider/deliveries/available')}>
            Back to Available Deliveries
          </Button>
        </div>
      </RiderSidebar>
    )
  }

  const order = delivery.order
  const items = order?.items || []

  return (
    <RiderSidebar>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Delivery Details
          </h1>
          <p className="text-warm-800/60 mt-1">
            #{delivery.orderNumber || order?.orderNumber || delivery.orderId.slice(-6)}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <Badge variant="delivery">{delivery.status}</Badge>
          {delivery.status === 'PENDING' && (
            <Badge variant="deal">Available for pickup</Badge>
          )}
          <span className="text-xs text-warm-800/50">
            Requested {new Date(delivery.createdAt).toLocaleDateString()} at {new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Map */}
        {delivery.pickupLatitude && delivery.pickupLongitude && delivery.dropoffLatitude && delivery.dropoffLongitude && (
          <Card className="p-4">
            <h2 className="font-semibold text-warm-900 mb-3">Delivery Route</h2>
            <div className="rounded-xl overflow-hidden border border-warm-200 h-64">
              <RiderMiniMap
                pickup={{ lat: delivery.pickupLatitude, lng: delivery.pickupLongitude }}
                dropoff={{ lat: delivery.dropoffLatitude, lng: delivery.dropoffLongitude }}
                height="256px"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-warm-50 p-3">
                <p className="text-xs text-warm-800/60">Distance</p>
                <p className="font-semibold text-warm-900">{delivery.distance || '—'}</p>
              </div>
              <div className="rounded-xl bg-warm-50 p-3">
                <p className="text-xs text-warm-800/60">Est. Travel Time</p>
                <p className="font-semibold text-warm-900">{(order as any)?.estimatedDelivery || delivery.estimatedTime || '—'}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Pickup and Dropoff */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Pickup */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-warm-800/60 uppercase tracking-wider mb-1">Pickup Location</p>
                <p className="font-medium text-warm-900">{delivery.pickupAddress}</p>
                {order?.shop?.name && <p className="text-sm text-warm-800/70">{order.shop.name}</p>}
                {order?.shop?.owner && (
                  <p className="text-sm text-warm-800/70">Contact: {order.shop.owner.name}</p>
                )}
                {(order?.shop as any)?.openingHours && (
                  <p className="text-xs text-warm-800/50 mt-1">Hours: {(order?.shop as any).openingHours}</p>
                )}
              </div>
            </div>

            <div className="ml-6 border-l-2 border-dashed border-warm-300 h-8" />

            {/* Dropoff */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-warm-800/60 uppercase tracking-wider mb-1">Dropoff Location</p>
                <p className="font-medium text-warm-900">{delivery.dropoffAddress}</p>
                {order?.customer && (
                  <p className="text-sm text-warm-800/70">
                    {order.customer.name || 'Customer'}
                    {order.customer.phone && ` • ${order.customer.phone}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Order Information */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-warm-900 mb-4">Order Information</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-800/60">Order Number</span>
              <span className="font-medium text-warm-900">#{delivery.orderNumber || order?.orderNumber || delivery.orderId.slice(-6)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-800/60">Delivery Fee</span>
              <span className="font-medium text-warm-900">{formatCurrency(Number(delivery.fee || 0))}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-800/60">Your Earnings</span>
              <span className="font-bold text-green-600">{formatCurrency(delivery.riderEarnings || 0)}</span>
            </div>

            {delivery.riderEarningsRecord && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-warm-800/60">Gross Amount</span>
                  <span className="text-warm-900">{formatCurrency(delivery.riderEarningsRecord.grossAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-warm-800/60">Platform Fee</span>
                  <span className="text-warm-900">{formatCurrency(delivery.riderEarningsRecord.platformFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-warm-200 pt-2">
                  <span className="text-sm font-medium text-warm-800/60">Net Earnings</span>
                  <span className="font-bold text-green-600">{formatCurrency(delivery.riderEarningsRecord.netAmount)}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-800/60">Items</span>
              <span className="text-warm-900">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>

            {order?.payment && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-800/60">Payment Status</span>
                <Badge variant={order.payment.status === 'PAID' || order.payment.status === 'SUCCESS' ? 'verified' : 'deal'}>
                  {order.payment.status}
                </Badge>
              </div>
            )}

            {order?.notes && (
              <div>
                <span className="text-sm text-warm-800/60">Delivery Instructions</span>
                <p className="text-sm text-warm-900 mt-1">{order.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Items */}
        {items.length > 0 && (
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-warm-900 mb-4">Order Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warm-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.product?.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Package size={20} className="text-warm-800/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-warm-900 truncate">{item.name}</p>
                    <p className="text-sm text-warm-800/60">{item.quantity} x {formatCurrency(Number(item.price))}</p>
                  </div>
                  <span className="text-sm font-medium text-warm-900">
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Customer Area / Delivery Area */}
        {order?.customer && (
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-warm-900 mb-4">Customer Information</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center overflow-hidden">
                {order.customer.avatar ? (
                  <img src={order.customer.avatar} alt={order.customer.name || 'Customer'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-warm-800/50">
                    {(order.customer.name || 'C').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-warm-900">{order.customer.name || 'Customer'}</p>
                {order.customer.location && <p className="text-sm text-warm-800/70">{order.customer.location}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Action Button */}
        {delivery.status === 'PENDING' && (
          <div className="sticky bottom-0 pb-4 pt-2">
            <Button
              fullWidth
              size="lg"
              loading={actionLoading}
              onClick={handleAccept}
              icon={<CheckCircle size={20} />}
            >
              {actionLoading ? 'Accepting...' : 'Accept Delivery'}
            </Button>
          </div>
        )}
      </div>
    </RiderSidebar>
  )
}
