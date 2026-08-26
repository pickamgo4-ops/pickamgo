'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, Truck, ChevronRight, MapPin, ShoppingBag, MessageCircle } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { Order } from '../../types'
import { mapApiOrderToFrontend } from '../../lib/api-mappers'
import { useRole } from '../../contexts/RoleContext'

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    if (!authInitialized) return
    if (!user) {
      router.push('/auth/login')
    }
  }, [user, authInitialized, router])

  useEffect(() => {
    if (!user) return
    loadOrders()
  }, [user])

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const response = await api.get<{ orders: any[] }>('/orders')
      if (response.success && response.data) {
        const mappedOrders = (response.data.orders || []).map((o: any) => mapApiOrderToFrontend(o))
        setOrders(mappedOrders)
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setOrdersLoading(false)
    }
  }

  const getFulfillmentBadge = (method?: string) => {
    switch (method) {
      case 'PLATFORM_DELIVERY':
        return <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Platform Delivery</span>
      case 'SELLER_DELIVERY':
        return <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Seller Delivery</span>
      case 'PICKUP':
        return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Pickup</span>
      default:
        return null
    }
  }

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-700', icon: Clock },
    picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: Clock },
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-6">
          My Orders
        </h1>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              No orders yet
            </h2>
            <p className="text-warm-800/60 mb-6">
              Your order history will appear here.
            </p>
            <Button onClick={() => router.push('/discover')}>Start Shopping</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
              const StatusIcon = status.icon
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-warm-900">
                        #{order.id.slice(-6)}
                      </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-warm-800/60 mb-2">
                    <span>{order.items.length} items · {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span className="font-bold text-warm-900">GH₵{order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-warm-800/50">{order.shopName}</span>
                    <div className="flex items-center gap-2">
                      {getFulfillmentBadge(order.fulfillmentMethod)}
                      {order.riderId && order.fulfillmentMethod === 'PLATFORM_DELIVERY' && (
                        <Button size="sm" variant="outline" onClick={() => router.push(`/messages/${order.riderId}?orderId=${order.id}`)} icon={<MessageCircle size={14} />}>
                          Rider
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
