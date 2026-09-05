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
  const [refund, setRefund] = useState<any>(null)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundRequest, setRefundRequest] = useState({ amount: '', reason: '' })
  const [refundError, setRefundError] = useState('')

  useEffect(() => {
    const loadOrder = async () => {
      const response = await api.get<any>(`/orders/${params.id}`)
      if (response.success && response.data) setOrder(response.data)
      else setError(response.error || 'Order not found')
      setLoading(false)
    }
    loadOrder()
  }, [params.id])

  useEffect(() => {
    if (!order) return
    api.getOrderRefunds(order.id).then((response) => {
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        setRefund(response.data[0])
      }
    })
  }, [order])

  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setRefundError('')
    setRefundLoading(true)
    const amount = Number(refundRequest.amount)
    if (!amount || amount <= 0) {
      setRefundError('Please enter a valid amount')
      setRefundLoading(false)
      return
    }
    if (order && amount > Number(order.total)) {
      setRefundError('Refund amount cannot exceed the order total')
      setRefundLoading(false)
      return
    }
    const response = await api.requestRefund({ orderId: order.id, amount, reason: refundRequest.reason || undefined })
    if (response.success) {
      setRefund(response.data)
      setRefundRequest({ amount: '', reason: '' })
    } else {
      setRefundError(response.error || 'Failed to request refund')
    }
    setRefundLoading(false)
  }

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
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-warm-900">Refund</h2>
          {refund ? (
            <div className="space-y-2">
              <p className="text-sm"><span className="font-medium text-warm-900">Status:</span> <Badge variant="default">{refund.status}</Badge></p>
              <p className="text-sm"><span className="font-medium text-warm-900">Amount:</span> GH₵{Number(refund.amount).toFixed(2)}</p>
              {refund.reason && <p className="text-sm text-warm-800/70">{refund.reason}</p>}
              {refund.adminNotes && <p className="text-sm text-warm-800/70">Note: {refund.adminNotes}</p>}
            </div>
          ) : order.status !== 'PAID' && order.status !== 'DELIVERED' ? (
            <p className="text-sm text-warm-800/60">Refunds are only available for paid or delivered orders.</p>
          ) : (
            <form onSubmit={handleRequestRefund} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-warm-900">Amount (GH₵)</label>
                <input type="number" step="0.01" max={Number(order.total)} required value={refundRequest.amount} onChange={(e) => setRefundRequest({ ...refundRequest, amount: e.target.value })} className="mt-1 block w-full rounded-lg border border-warm-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-900">Reason (optional)</label>
                <textarea value={refundRequest.reason} onChange={(e) => setRefundRequest({ ...refundRequest, reason: e.target.value })} className="mt-1 block w-full rounded-lg border border-warm-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
              </div>
              {refundError && <p className="text-sm text-red-600">{refundError}</p>}
              <Button type="submit" disabled={refundLoading} variant="outline">{refundLoading ? 'Requesting…' : 'Request Refund'}</Button>
            </form>
          )}
        </Card>
      </div>
    </SellerSidebar>
  )
}
