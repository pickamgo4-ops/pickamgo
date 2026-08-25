'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Clock, CheckCircle, XCircle, Truck, Package } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

export default function SellerOrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadOrders()
  }, [filter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const query = filter ? `?status=${filter}` : ''
      const response = await api.get<{ orders: any[] }>(`/seller/orders${query}`)
      if (response.success && response.data) {
        setOrders(response.data.orders || [])
      }
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status })
      if (response.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      }
    } catch {
      setError('Failed to update order status')
    }
  }

  const statusConfig: Record<string, { label: string; color: string; nextActions: string[] }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-700', nextActions: ['PAID', 'CANCELLED'] },
    PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-700', nextActions: ['CONFIRMED', 'CANCELLED'] },
    CONFIRMED: { label: 'Confirmed', color: 'bg-purple-100 text-purple-700', nextActions: ['PREPARING', 'CANCELLED'] },
    PREPARING: { label: 'Preparing', color: 'bg-orange-100 text-orange-700', nextActions: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] },
    READY_FOR_PICKUP: { label: 'Ready for Pickup', color: 'bg-teal-100 text-teal-700', nextActions: ['OUT_FOR_DELIVERY'] },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-700', nextActions: ['DELIVERED'] },
    DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700', nextActions: [] },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', nextActions: [] },
    FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', nextActions: [] },
  }

  const actionLabels: Record<string, string> = {
    PAID: 'Accept',
    CONFIRMED: 'Start Preparing',
    PREPARING: 'Mark Ready',
    READY_FOR_PICKUP: 'Send for Delivery',
    OUT_FOR_DELIVERY: 'Mark Delivered',
    CANCELLED: 'Cancel',
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading orders...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Orders</h1>
          <p className="text-warm-800/60 mt-1">{orders.length} orders</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex max-w-full flex-wrap gap-2">
          <Button variant={filter === '' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('')}>
            All
          </Button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={filter === key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {config.label}
            </Button>
          ))}
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No orders yet</h3>
            <p className="text-sm text-warm-800/60">Orders will appear here when customers purchase from your shop</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
              const customer = order.customer || {}

              return (
                <Card key={order.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-warm-900">#{order.orderNumber}</h3>
                        <Badge variant={status.color.includes('green') ? 'verified' : status.color.includes('red') ? 'deal' : 'default'}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-warm-800/60 mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-bold text-warm-900 text-lg">GH₵{Number(order.total).toFixed(2)}</span>
                  </div>

                  <div className="mb-4 rounded-xl bg-warm-50 border border-warm-200 px-3 py-2 text-sm">
                      <p className="font-medium text-warm-900">{order.fulfillmentMethod === 'SELLER_OWN_DELIVERY' ? 'Seller delivery' : order.fulfillmentMethod === 'CUSTOMER_PICKUP' ? 'Customer pickup' : 'PickAmGo delivery'}</p>
                      {order.fulfillmentMethod === 'FIND_IT_NEAR_ME_RIDER' && <p className="text-warm-800/60 mt-1">Delivery is being handled by a PickAmGo rider{order.rider?.name ? `: ${order.rider.name}` : ''}. Rider status: {order.delivery?.status || order.deliveryStatus || 'Awaiting rider'}.</p>}
                    {order.fulfillmentMethod === 'CUSTOMER_PICKUP' && <p className="text-warm-800/60 mt-1">Confirm completion after the customer collects the order.</p>}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <Avatar src={customer.avatar} fallback={customer.name?.[0]} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-warm-900">{customer.name || 'Guest'}</p>
                      <p className="text-xs text-warm-800/60">{order.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(order.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Package size={14} className="text-warm-800/50" />
                        <span className="text-warm-900">{item.name}</span>
                        <span className="text-warm-800/60">x{item.quantity}</span>
                        <span className="text-warm-800/60 ml-auto">GH₵{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {status.nextActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-warm-200">
                      {status.nextActions.includes('CONFIRMED') && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}>
                          Accept
                        </Button>
                      )}
                      {status.nextActions.includes('PREPARING') && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'PREPARING')}>
                          Start Preparing
                        </Button>
                      )}
                      {status.nextActions.includes('READY_FOR_PICKUP') && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}>
                          Mark Ready
                        </Button>
                      )}
                      {status.nextActions.includes('OUT_FOR_DELIVERY') && order.fulfillmentMethod === 'SELLER_OWN_DELIVERY' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}>
                          Send for Delivery
                        </Button>
                      )}
                      {status.nextActions.includes('DELIVERED') && order.fulfillmentMethod === 'SELLER_OWN_DELIVERY' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}>
                          Mark Delivered
                        </Button>
                      )}
                      {status.nextActions.includes('DELIVERED') && order.fulfillmentMethod === 'CUSTOMER_PICKUP' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}>
                          Confirm Customer Pickup
                        </Button>
                      )}
                      {status.nextActions.includes('CANCELLED') && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
