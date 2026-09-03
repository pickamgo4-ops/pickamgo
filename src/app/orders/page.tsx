'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, Truck, ChevronRight, MapPin, ShoppingBag, MessageCircle, Calendar } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { Order } from '../../types'
import { mapApiOrderToFrontend } from '../../lib/api-mappers'
import { useRole } from '../../contexts/RoleContext'

interface BookingRecord {
  id: string
  date: string
  timeSlot: string
  status: string
  service?: { name?: string; price?: number | string; duration?: string }
  provider?: { name?: string }
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [orders, setOrders] = useState<Order[]>([])
  const [bookings, setBookings] = useState<BookingRecord[]>([])
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
      const [ordersResponse, bookingsResponse] = await Promise.all([
        api.get<{ orders: any[] }>('/orders'),
        api.get<{ bookings: BookingRecord[] }>('/bookings'),
      ])
      if (ordersResponse.success && ordersResponse.data) {
        setOrders((ordersResponse.data.orders || []).map((o: any) => mapApiOrderToFrontend(o)))
      }
      if (bookingsResponse.success && bookingsResponse.data) setBookings(bookingsResponse.data.bookings || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setOrdersLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    if (!window.confirm('Cancel this booking?')) return
    const response = await api.patch(`/bookings/${bookingId}/status`, { status: 'CANCELLED' })
    if (response.success) await loadOrders()
    else window.alert(response.error || 'This booking could not be cancelled.')
  }

  const currentDate = new Date()
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
  const upcomingBookings = bookings.filter(booking => booking.date >= today && !['CANCELLED', 'COMPLETED'].includes(booking.status))
  const pastBookings = bookings.filter(booking => !upcomingBookings.includes(booking))

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

        {bookings.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-primary" />
              <h2 className="font-display text-xl font-bold text-warm-900">My Bookings</h2>
            </div>
            {upcomingBookings.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-800/60 mb-2">Upcoming</h3>
                <div className="space-y-3">
                  {upcomingBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-2xl p-4 border border-warm-200 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-warm-900">{booking.service?.name || 'Service'}</h4>
                          <p className="text-sm text-warm-800/60">{booking.provider?.name || 'Provider'} · #{booking.id.slice(-8).toUpperCase()}</p>
                        </div>
                        <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">{booking.status}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-warm-800/70">
                        <span><Calendar size={14} className="inline mr-1" />{booking.date}</span>
                        <span><Clock size={14} className="inline mr-1" />{booking.timeSlot}</span>
                        <span className="font-semibold text-warm-900">GH₵{Number(booking.service?.price || 0).toFixed(2)}</span>
                      </div>
                      {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => cancelBooking(booking.id)}>Cancel booking</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pastBookings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-800/60 mb-2">Past</h3>
                <div className="space-y-2">
                  {pastBookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border border-warm-200 bg-warm-50 p-3 text-sm">
                      <span className="text-warm-900">{booking.service?.name || 'Service'} · {booking.date} at {booking.timeSlot}</span>
                      <span className="text-xs font-medium text-warm-800/60">{booking.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

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
