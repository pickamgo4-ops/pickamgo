'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Search, Package, CheckCircle, Clock, Truck, MapPin, Phone, ChevronLeft } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'
import { TrackingOrder } from '../../../types'

type TimelineStep = {
  status: string
  label: string
  completed: boolean
  active: boolean
  icon: any
}

const PLATFORM_TIMELINE: Omit<TimelineStep, 'completed' | 'active'>[] = [
  { status: 'PENDING_PAYMENT', label: 'Order placed', icon: Package },
  { status: 'PAID', label: 'Payment confirmed', icon: CheckCircle },
  { status: 'CONFIRMED', label: 'Order confirmed', icon: CheckCircle },
  { status: 'PREPARING', label: 'Seller preparing', icon: Clock },
  { status: 'READY_FOR_PICKUP', label: 'Rider assigned', icon: Truck },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: MapPin },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
]

const SELLER_TIMELINE: Omit<TimelineStep, 'completed' | 'active'>[] = [
  { status: 'PENDING_PAYMENT', label: 'Order placed', icon: Package },
  { status: 'PAID', label: 'Payment confirmed', icon: CheckCircle },
  { status: 'CONFIRMED', label: 'Order confirmed', icon: CheckCircle },
  { status: 'PREPARING', label: 'Seller preparing', icon: Clock },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
]

const PICKUP_TIMELINE: Omit<TimelineStep, 'completed' | 'active'>[] = [
  { status: 'PENDING_PAYMENT', label: 'Order placed', icon: Package },
  { status: 'PAID', label: 'Payment confirmed', icon: CheckCircle },
  { status: 'CONFIRMED', label: 'Order confirmed', icon: CheckCircle },
  { status: 'PREPARING', label: 'Preparing your order', icon: Clock },
  { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', icon: Package },
  { status: 'DELIVERED', label: 'Picked up', icon: CheckCircle },
]

export default function TrackOrderPage() {
  const params = useParams()
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [trackingData, setTrackingData] = useState<TrackingOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.orderNumber && typeof params.orderNumber === 'string') {
      const decoded = decodeURIComponent(params.orderNumber)
      setOrderNumber(decoded)
      trackOrder(decoded)
    }
  }, [params.orderNumber])

  const trackOrder = async (orderNum: string) => {
    if (!orderNum.trim()) return
    setLoading(true)
    setError('')
    setTrackingData(null)

    try {
      const response = await api.get<any>(`/tracking/${orderNum}`)
      if (response.success && response.data) {
        const currentStatus = response.data.status || 'PENDING_PAYMENT'

        let timelineSteps: Omit<TimelineStep, 'completed' | 'active'>[] = []
        if (response.data.fulfillmentMethod === 'PLATFORM_DELIVERY') {
          timelineSteps = PLATFORM_TIMELINE
        } else if (response.data.fulfillmentMethod === 'SELLER_DELIVERY') {
          timelineSteps = SELLER_TIMELINE
        } else {
          timelineSteps = PICKUP_TIMELINE
        }

        const statusOrder = timelineSteps.map(s => s.status)
        const currentIndex = statusOrder.indexOf(currentStatus)

        const timeline: TimelineStep[] = timelineSteps.map((step, index) => ({
          ...step,
          completed: index <= currentIndex,
          active: index === currentIndex,
        }))

        setTrackingData({
          orderNumber: response.data.orderNumber || orderNum,
          status: currentStatus,
          items: response.data.items || [],
          total: response.data.total || 0,
          shopName: response.data.shopName || '',
          deliveryAddress: response.data.deliveryAddress || '',
          createdAt: response.data.createdAt || '',
          estimatedDelivery: response.data.estimatedDelivery || '',
          fulfillmentMethod: response.data.fulfillmentMethod || 'PLATFORM_DELIVERY',
          timeline,
        })
      } else {
        setError(response.error || 'Order not found')
      }
    } catch (err) {
      setError('Failed to fetch order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (orderNumber.trim()) {
      router.push(`/track/${encodeURIComponent(orderNumber.trim())}`)
    }
  }

  const statusConfig: Record<string, { color: string; bg: string }> = {
    PENDING_PAYMENT: { color: 'text-yellow-700', bg: 'bg-yellow-100' },
    PAID: { color: 'text-blue-700', bg: 'bg-blue-100' },
    CONFIRMED: { color: 'text-purple-700', bg: 'bg-purple-100' },
    PREPARING: { color: 'text-orange-700', bg: 'bg-orange-100' },
    READY_FOR_PICKUP: { color: 'text-teal-700', bg: 'bg-teal-100' },
    OUT_FOR_DELIVERY: { color: 'text-indigo-700', bg: 'bg-indigo-100' },
    DELIVERED: { color: 'text-green-700', bg: 'bg-green-100' },
    CANCELLED: { color: 'text-red-700', bg: 'bg-red-100' },
  }

  const getFulfillmentLabel = (method?: string) => {
    switch (method) {
      case 'PLATFORM_DELIVERY': return 'Platform Delivery'
      case 'SELLER_DELIVERY': return 'Seller Delivery'
      case 'PICKUP': return 'Pickup'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ChevronLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Track Order
            </h1>
            <p className="text-warm-800/60">Enter your order number to track</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter order number (e.g., #FIN-12345)"
                value={orderNumber}
                onValueChange={setOrderNumber}
                icon={<Search size={20} />}
              />
            </div>
            <Button type="submit" disabled={!orderNumber.trim()}>
              Track
            </Button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Tracking order...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <Package size={48} className="text-red-300 mx-auto mb-3" />
            <h3 className="font-semibold text-warm-900 mb-1">Order Not Found</h3>
            <p className="text-sm text-warm-800/60 mb-4">{error}</p>
            <p className="text-xs text-warm-800/50">Please check the order number and try again.</p>
          </div>
        )}

        {trackingData && !loading && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-warm-900">Order #{trackingData.orderNumber}</h3>
                  <p className="text-sm text-warm-800/60">
                    {trackingData.shopName && `From ${trackingData.shopName}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusConfig[trackingData.status] && (
                    <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusConfig[trackingData.status].bg} ${statusConfig[trackingData.status].color}`}>
                      {trackingData.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {trackingData.fulfillmentMethod && (
                    <span className="text-[10px] bg-warm-100 text-warm-700 px-2 py-1 rounded-full font-medium">
                      {getFulfillmentLabel(trackingData.fulfillmentMethod)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {trackingData.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-warm-100 overflow-hidden flex-shrink-0">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-900 truncate">{item.name}</p>
                      <p className="text-xs text-warm-800/60">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium text-warm-900">GH₵{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-warm-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-warm-900">Total</span>
                <span className="font-bold text-lg text-warm-900">GH₵{trackingData.total.toFixed(2)}</span>
              </div>

              {trackingData.deliveryAddress && (
                <div className="mt-3 p-3 bg-warm-50 rounded-xl flex items-start gap-2">
                  <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-warm-800/60">Delivery Address</p>
                    <p className="text-sm font-medium text-warm-900">{trackingData.deliveryAddress}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Delivery Timeline</h3>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-warm-200" />
                <div className="space-y-6">
                  {trackingData.timeline.map((step) => {
                    const Icon = step.icon
                    return (
                      <div key={step.status} className="flex items-start gap-4 relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 ${
                          step.completed ? 'bg-primary text-white' : 'bg-warm-100 text-warm-800/40'
                        }`}>
                          <Icon size={20} />
                        </div>
                        <div className="pt-2">
                          <p className={`font-medium text-sm ${step.completed ? 'text-warm-900' : 'text-warm-800/50'}`}>
                            {step.label}
                          </p>
                          {step.active && (
                            <p className="text-xs text-primary font-medium mt-0.5">Current status</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
