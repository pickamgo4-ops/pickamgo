'use client'

import React, { useEffect, useState } from 'react'
import { FlaskConical, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface CustomerOption { id: string; name: string; email: string }
interface ProductOption { id: string; name: string; price: number; shopId: string; shop: { name: string } }
interface TestOrder { id: string; orderNumber: string; status: string; total: number; createdAt: string; shop: { name: string }; customer: { name: string; email: string } | null; rider: { name: string } | null; delivery: { status: string } | null }
interface OptionsResponse { customers: CustomerOption[]; products: ProductOption[] }

export default function TestOrdersPage() {
  const [options, setOptions] = useState<OptionsResponse>({ customers: [], products: [] })
  const [orders, setOrders] = useState<TestOrder[]>([])
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [address, setAddress] = useState('Local test delivery address')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const [optionsResponse, ordersResponse] = await Promise.all([
      api.get<OptionsResponse>('/dev/test-orders/options'),
      api.get<TestOrder[]>('/dev/test-orders'),
    ])
    if (optionsResponse.success && optionsResponse.data) setOptions(optionsResponse.data)
    if (ordersResponse.success && ordersResponse.data) setOrders(ordersResponse.data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const createTestOrder = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const response = await api.post<TestOrder>('/dev/test-orders', {
      customerId,
      productId,
      quantity: Number(quantity),
      deliveryAddress: address,
      deliveryFee: 0,
    })
    setMessage(response.success ? 'Test order created.' : response.error || 'Could not create test order.')
    if (response.success) void load()
    setSaving(false)
  }

  const resetOrder = async (orderId: string) => {
    if (!window.confirm('Reset this test order?')) return
    const response = await api.delete(`/dev/test-orders/${orderId}`)
    setMessage(response.success ? 'Test order reset.' : response.error || 'Could not reset test order.')
    if (response.success) void load()
  }

  if (process.env.NODE_ENV === 'production') {
    return <Card className="p-8 text-center"><h1 className="font-display text-2xl font-bold text-warm-900">Unavailable</h1><p className="mt-2 text-warm-800/60">Test order controls are disabled in production.</p></Card>
  }

  return (
    <div className="space-y-6">
      <div><div className="flex items-center gap-3"><FlaskConical className="text-primary" /><h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Local Test Orders</h1></div><p className="mt-1 text-warm-800/60">Create safe orders that use the real seller, rider, tracking, and delivery workflow.</p></div>
      {message && <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-warm-900">{message}</div>}
      <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">Create Test Order</h2><form onSubmit={createTestOrder} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-warm-900">Customer<select value={customerId} onChange={event => setCustomerId(event.target.value)} required className="mt-2 w-full rounded-xl border border-warm-200 bg-white p-3"><option value="">Select customer</option>{options.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} ({customer.email})</option>)}</select></label>
        <label className="text-sm font-medium text-warm-900">Product<select value={productId} onChange={event => setProductId(event.target.value)} required className="mt-2 w-full rounded-xl border border-warm-200 bg-white p-3"><option value="">Select product</option>{options.products.map(product => <option key={product.id} value={product.id}>{product.name} - GH₵{Number(product.price).toFixed(2)} ({product.shop.name})</option>)}</select></label>
        <Input label="Quantity" type="number" min="1" max="20" value={quantity} onChange={event => setQuantity(event.target.value)} required />
        <Input label="Delivery address" value={address} onChange={event => setAddress(event.target.value)} required />
        <div className="md:col-span-2"><Button type="submit" disabled={saving || loading}>{saving ? 'Creating...' : 'Create Test Order'}</Button></div>
      </form></Card>
      <Card className="p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-warm-900">Test Orders</h2><Badge variant="deal">TEST ONLY</Badge></div>{orders.length === 0 ? <p className="text-sm text-warm-800/60">No test orders yet.</p> : <div className="space-y-3">{orders.map(order => <div key={order.id} className="flex flex-col gap-3 rounded-xl border border-warm-200 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-warm-900">{order.orderNumber} <span className="font-normal text-warm-800/60">{order.shop.name}</span></p><p className="text-sm text-warm-800/60">{order.customer?.name || 'Customer'} · {order.status} · Delivery: {order.delivery?.status || 'Not assigned'}</p></div><div className="flex items-center gap-3"><span className="font-semibold text-warm-900">GH₵{Number(order.total).toFixed(2)}</span><Button size="sm" variant="outline" onClick={() => void resetOrder(order.id)} icon={<Trash2 size={15} />}>Reset</Button></div></div>)}</div>}</Card>
    </div>
  )
}
