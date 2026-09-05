'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Search, Package, CheckCircle, Clock, Truck, MapPin, ChevronLeft } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'
import { TrackingOrder } from '../../../types'

type TimelineStep = { status: string; label: string; completed: boolean; active: boolean; icon: any }

const PLATFORM_TIMELINE: Omit<TimelineStep, 'completed' | 'active'>[] = [
  { status: 'PENDING_PAYMENT', label: 'Order placed', icon: Package },
  { status: 'PAID', label: 'Payment confirmed', icon: CheckCircle },
  { status: 'CONFIRMED', label: 'Order confirmed', icon: CheckCircle },
  { status: 'PREPARING', label: 'Seller preparing', icon: Clock },
  { status: 'READY_FOR_PICKUP', label: 'Rider assigned', icon: Truck },
  { status: 'PICKED_UP', label: 'Picked up', icon: Package },
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

export default function TrackOrderPage() {
  const params = useParams()
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [trackingData, setTrackingData] = useState<TrackingOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trackOrder = async (number: string, orderEmail: string) => {
    if (!number.trim() || !orderEmail.trim()) return
    setLoading(true)
    setError('')
    try {
      const response = await api.get<any>(`/tracking/${encodeURIComponent(number)}?email=${encodeURIComponent(orderEmail.trim())}`)
      if (!response.success || !response.data) {
        setTrackingData(null)
        setError(response.error || 'Order not found')
        return
      }
      const status = response.data.trackingStatus || response.data.status || 'PENDING_PAYMENT'
      const timelineSteps = response.data.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER' || response.data.fulfillmentMethod === 'PLATFORM_DELIVERY' ? PLATFORM_TIMELINE : SELLER_TIMELINE
      const currentIndex = timelineSteps.findIndex(step => step.status === status)
      setTrackingData({
        orderNumber: response.data.orderNumber || number,
        status,
        items: response.data.items || [],
        total: Number(response.data.total || 0),
        shopName: response.data.shopName || '',
        deliveryAddress: response.data.deliveryAddress || '',
        createdAt: response.data.createdAt || '',
        estimatedDelivery: response.data.estimatedDelivery || '',
        fulfillmentMethod: response.data.fulfillmentMethod || 'FIND_IT_NEAR_ME_RIDER',
        timeline: timelineSteps.map((step, index) => ({ ...step, completed: index <= currentIndex, active: index === currentIndex })),
      })
    } catch {
      setError('Failed to fetch order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof params.orderNumber !== 'string') return
    const number = decodeURIComponent(params.orderNumber)
    const orderEmail = new URLSearchParams(window.location.search).get('email') || ''
    setOrderNumber(number)
    setEmail(orderEmail)
    if (orderEmail) void trackOrder(number, orderEmail)
  }, [params.orderNumber])

  useEffect(() => {
    if (!orderNumber || !email || !trackingData || ['DELIVERED', 'CANCELLED', 'FAILED'].includes(trackingData.status)) return
    const timer = window.setInterval(() => void trackOrder(orderNumber, email), 10000)
    return () => window.clearInterval(timer)
  }, [orderNumber, email, trackingData?.status])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    if (orderNumber.trim() && email.trim()) router.push(`/track/${encodeURIComponent(orderNumber.trim())}?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6"><button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100"><ChevronLeft size={20} /></button><div><h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Track Order</h1><p className="text-warm-800/60">Enter your email and order number to track</p></div></div>
        <form onSubmit={handleSearch} className="mb-6 space-y-2"><Input type="email" placeholder="Email used for the order" value={email} onValueChange={setEmail} required /><div className="flex gap-2"><Input placeholder="Enter order number" value={orderNumber} onValueChange={setOrderNumber} icon={<Search size={20} />} required /><Button type="submit" disabled={!orderNumber.trim() || !email.trim()}>Track</Button></div></form>
        {loading && <div className="py-20 text-center text-warm-800/60">Tracking order...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center"><Package size={48} className="text-red-300 mx-auto mb-3" /><h3 className="font-semibold text-warm-900">Order Not Found</h3><p className="text-sm text-warm-800/60 mt-2">{error}</p></div>}
        {trackingData && !loading && <div className="space-y-6"><Card className="p-6"><div className="flex items-center justify-between mb-4"><div><h3 className="font-semibold text-warm-900">Order #{trackingData.orderNumber}</h3><p className="text-sm text-warm-800/60">{trackingData.shopName && `From ${trackingData.shopName}`}</p></div><Badge variant="default">{trackingData.status.replace(/_/g, ' ')}</Badge></div><div className="space-y-3 mb-4">{trackingData.items.map((item: any, index: number) => <div key={index} className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-warm-100 overflow-hidden">{item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}</div><div className="flex-1"><p className="text-sm font-medium text-warm-900">{item.name}</p><p className="text-xs text-warm-800/60">Qty: {item.quantity}</p></div><span>GH₵{(Number(item.price) * item.quantity).toFixed(2)}</span></div>)}</div><div className="border-t border-warm-200 pt-3 flex justify-between font-bold"><span>Total</span><span>GH₵{trackingData.total.toFixed(2)}</span></div><div className="mt-3 p-3 bg-warm-50 rounded-xl"><p className="text-xs text-warm-800/60">Delivery Address</p><p className="text-sm font-medium text-warm-900">{trackingData.deliveryAddress}</p></div></Card><Card className="p-6"><h3 className="font-semibold text-warm-900 mb-4">Delivery Timeline</h3><div className="space-y-4">{trackingData.timeline.map(step => { const Icon = step.icon; return <div key={step.status} className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.completed ? 'bg-primary text-white' : 'bg-warm-100 text-warm-800/40'}`}><Icon size={18} /></div><div><p className="text-sm font-medium text-warm-900">{step.label}</p>{step.active && <p className="text-xs text-primary">Current status</p>}</div></div> })}</div></Card></div>}
      </main>
      <BottomNav />
    </div>
  )
}
