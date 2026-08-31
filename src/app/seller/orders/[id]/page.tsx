'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Package, Phone, Truck } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import dynamic from 'next/dynamic'

const GoogleMap = dynamic(() => import('@/components/map/GoogleMap'), { ssr: false })
import { api } from '@/lib/api'

export default function SellerOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrder = async () => {
      const response = await api.get<any>(`/orders/${params.id}`)
      if (response.success && response.data) setOrder(response.data)
      else setError(response.error || 'Order not found')
      setLoading(false)
    }
    loadOrder()
  }, [params.id])

  if (loading) return <SellerSidebar><p className="py-20 text-center text-warm-800/60">Loading order...</p></SellerSidebar>
  if (!order) return <SellerSidebar><p className="py-20 text-center text-red-600">{error}</p></SellerSidebar>

  const delivery = order.delivery
  const hasRoute = delivery?.pickupLatitude != null && delivery?.pickupLongitude != null && delivery?.dropoffLatitude != null && delivery?.dropoffLongitude != null
  const markers = hasRoute ? [
    { latitude: delivery.pickupLatitude, longitude: delivery.pickupLongitude, label: `PICKUP - ${order.shop?.name || 'Shop'}`, color: '#16a34a' },
    { latitude: delivery.dropoffLatitude, longitude: delivery.dropoffLongitude, label: `DELIVERY - ${order.deliveryAddress}`, color: '#dc2626' },
  ] : []

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-sm text-warm-800/70 hover:text-primary"><ArrowLeft size={18} /> Back to orders</button>
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="font-display text-2xl font-bold text-warm-900">Order #{order.orderNumber}</h1><p className="text-sm text-warm-800/60">{new Date(order.createdAt).toLocaleString()}</p></div>
          <Badge variant="default">{order.status}</Badge>
        </div>
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-warm-900">Customer</h2>
          <p className="font-medium text-warm-900">{order.customer?.name || order.guestName || 'Guest'}</p>
          {(order.customer?.phone || order.guestPhone) && <p className="flex items-center gap-2 text-sm text-warm-800/70"><Phone size={15} /> {order.customer?.phone || order.guestPhone}</p>}
          <div className="border-t border-warm-200 pt-4"><p className="flex items-center gap-2 text-sm font-medium text-warm-900"><MapPin size={16} className="text-primary" /> Delivery address</p><p className="mt-1 text-sm text-warm-800/70">{order.deliveryAddress}</p></div>
        </Card>
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-warm-900">Delivery</h2>
          <p className="flex items-center gap-2 text-sm text-warm-800/70"><Truck size={16} /> {order.fulfillmentMethod === 'CUSTOMER_PICKUP' ? 'Customer pickup' : 'PickAmGo delivery'}</p>
          <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-warm-800/50">Pickup</p><p className="text-sm font-medium text-warm-900">{order.shop?.name}: {delivery?.pickupAddress || order.shop?.location}</p></div><div><p className="text-xs uppercase text-warm-800/50">Delivery</p><p className="text-sm font-medium text-warm-900">{order.deliveryAddress}</p></div></div>
          {order.rider ? <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800"><strong>Rider Assigned:</strong> {order.rider.name}</div> : <p className="text-sm text-warm-800/60">Rider not assigned yet.</p>}
          {hasRoute ? <GoogleMap markers={markers} route={{ from: markers[0], to: markers[1] }} height="300px" /> : <p className="text-sm text-warm-800/60">Delivery map unavailable because coordinates were not provided.</p>}
        </Card>
        <Card className="p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold text-warm-900"><Package size={18} /> Items</h2>{(order.items || []).map((item: any) => <div key={item.id} className="flex justify-between border-b border-warm-100 py-2 text-sm"><span>{item.name} x{item.quantity}</span><span>GH₵{(Number(item.price) * item.quantity).toFixed(2)}</span></div>)}</Card>
      </div>
    </SellerSidebar>
  )
}
