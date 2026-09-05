'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle, Package, Search, ShoppingBag, XCircle } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

const statusConfig: Record<string, { label: string; color: string; actions: string[] }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-700', actions: [] },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-700', actions: ['CONFIRMED', 'CANCELLED'] },
  CONFIRMED: { label: 'Confirmed', color: 'bg-purple-100 text-purple-700', actions: ['PREPARING', 'CANCELLED'] },
  PREPARING: { label: 'Processing', color: 'bg-orange-100 text-orange-700', actions: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] },
  READY_FOR_PICKUP: { label: 'Ready', color: 'bg-teal-100 text-teal-700', actions: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-700', actions: ['DELIVERED'] },
  DELIVERED: { label: 'Completed', color: 'bg-green-100 text-green-700', actions: [] },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', actions: [] },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', actions: [] },
}

const actionLabels: Record<string, string> = {
  CONFIRMED: 'Accept order',
  PREPARING: 'Start processing',
  READY_FOR_PICKUP: 'Mark ready',
  OUT_FOR_DELIVERY: 'Send for delivery',
  DELIVERED: 'Mark completed',
  CANCELLED: 'Cancel order',
}

const tabs = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PAID' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY_FOR_PICKUP' },
  { label: 'Completed', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

export default function ManageOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadOrders = async () => {
      setLoading(true)
      const query = new URLSearchParams()
      if (filter) query.set('status', filter)
      if (search.trim()) query.set('search', search.trim())
      const response = await api.get<{ orders: any[] }>(`/seller/orders${query.toString() ? `?${query}` : ''}`)
      if (!active) return
      if (response.success && response.data) setOrders(response.data.orders || [])
      else setError(response.error || 'Failed to load orders')
      setLoading(false)
    }
    const timeout = window.setTimeout(loadOrders, search ? 250 : 0)
    return () => { active = false; window.clearTimeout(timeout) }
  }, [filter, search])

  const updateStatus = async (orderId: string, status: string) => {
    setSaving(orderId)
    setError('')
    const response = await api.patch(`/orders/${orderId}/status`, { status })
    if (response.success) {
      setOrders(previous => previous.map(order => order.id === orderId ? { ...order, status } : order))
    } else {
      setError(response.error || 'Order status could not be updated')
    }
    setSaving(null)
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold"><CheckCircle size={17} /> ORDER MANAGEMENT</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mt-1">Manage Orders</h1>
          <p className="text-warm-800/60 mt-1">Process seller orders and move them through valid fulfillment steps.</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => <Button key={tab.value} variant={filter === tab.value ? 'primary' : 'outline'} size="sm" onClick={() => setFilter(tab.value)}>{tab.label}</Button>)}
        </div>

        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/40" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order number, customer name, or phone" className="w-full rounded-xl border border-warm-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-primary" />
        </div>

        {loading ? <p className="py-16 text-center text-warm-800/60">Loading orders...</p> : orders.length === 0 ? (
          <Card className="p-12 text-center"><ShoppingBag size={48} className="mx-auto text-warm-800/30 mb-4" /><h3 className="font-semibold text-warm-900">No orders match this view</h3><p className="text-sm text-warm-800/60 mt-2">New seller orders will appear here when available.</p></Card>
        ) : <div className="space-y-4">{orders.map(order => {
          const config = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
          const customer = order.customer || {}
          return <Card key={order.id} className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-warm-900">#{order.orderNumber}</h2><Badge variant={config.color.includes('green') ? 'verified' : config.color.includes('red') ? 'deal' : 'default'}>{config.label}</Badge></div>
                <p className="text-xs text-warm-800/60 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-4"><Avatar src={customer.avatar} fallback={customer.name?.[0]} size="sm" /><div><p className="text-sm font-medium text-warm-900">{customer.name || 'Guest'}</p><p className="text-xs text-warm-800/60">{customer.phone || order.deliveryAddress}</p></div></div>
              </div>
              <div className="text-left lg:text-right"><p className="font-bold text-warm-900 text-lg">GH₵{Number(order.total).toFixed(2)}</p><p className="text-xs text-warm-800/60">{order.fulfillmentMethod === 'CUSTOMER_PICKUP' ? 'Customer pickup' : order.fulfillmentMethod === 'SELLER_OWN_DELIVERY' ? 'Seller delivery' : 'PickAmGo delivery'}</p></div>
            </div>
            <div className="mt-4 space-y-2">{(order.items || []).map((item: any) => <div key={item.id || item.name} className="flex items-center gap-2 text-sm"><Package size={14} className="text-warm-800/50" /><span>{item.name}</span><span className="text-warm-800/60">x{item.quantity}</span></div>)}</div>
            {config.actions.length > 0 && <div className="flex flex-wrap gap-2 border-t border-warm-200 mt-4 pt-4">{config.actions.map(action => <Button key={action} size="sm" variant={action === 'CANCELLED' ? 'outline' : 'primary'} disabled={saving === order.id} onClick={() => updateStatus(order.id, action)}>{saving === order.id ? 'Saving...' : actionLabels[action]}</Button>)}</div>}
            <p className="text-xs text-warm-800/60 mt-4">Only transitions allowed by the backend for this order and fulfillment method are shown.</p>
          </Card>
        })}</div>}
      </div>
    </SellerSidebar>
  )
}
