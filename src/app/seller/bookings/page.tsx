'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Users, DollarSign } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

export default function SellerBookingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadBookings()
  }, [filter])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const query = filter ? `?status=${filter}` : ''
      const response = await api.get<{ bookings: any[] }>(`/seller/bookings${query}`)
      if (response.success && response.data) {
        setBookings(response.data.bookings || [])
      }
    } catch {
      setError('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      const response = await api.patch(`/bookings/${bookingId}/status`, { status })
      if (response.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
      }
    } catch {
      setError('Failed to update booking')
    }
  }

  const statusConfig: Record<string, { label: string; color: string; nextActions: string[] }> = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', nextActions: ['CONFIRMED', 'CANCELLED'] },
    CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-700', nextActions: ['COMPLETED', 'CANCELLED'] },
    COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-700', nextActions: [] },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', nextActions: [] },
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading bookings...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Bookings</h1>
          <p className="text-warm-800/60 mt-1">{bookings.length} bookings</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant={filter === '' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('')}>
            All
          </Button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Button key={key} variant={filter === key ? 'primary' : 'outline'} size="sm" onClick={() => setFilter(key)}>
              {config.label}
            </Button>
          ))}
        </div>

        {bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No bookings yet</h3>
            <p className="text-sm text-warm-800/60">Bookings will appear here when customers book your services</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = statusConfig[booking.status] || statusConfig.PENDING
              const customer = booking.customer || {}
              const service = booking.service || {}

              return (
                <Card key={booking.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-warm-900">{service.name || 'Service'}</h3>
                        <Badge variant={status.color.includes('green') ? 'verified' : status.color.includes('red') ? 'deal' : 'default'}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-warm-800/60 mt-1">#{booking.id.slice(-6)}</p>
                    </div>
                    <span className="font-bold text-warm-900">GH₵{service.price?.toFixed(2) || '0.00'}</span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={customer.avatar} fallback={customer.name?.[0]} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-warm-900">{customer.name || 'Guest'}</p>
                      <p className="text-xs text-warm-800/60">{customer.phone || ''}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-warm-800/70">
                      <Calendar size={16} className="text-warm-800/50" />
                      {booking.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-warm-800/70">
                      <Clock size={16} className="text-warm-800/50" />
                      {booking.timeSlot}
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="text-sm text-warm-800/60 mb-3 p-2 bg-warm-50 rounded-lg">{booking.notes}</p>
                  )}

                  {status.nextActions.length > 0 && (
                    <div className="flex gap-2 pt-3 border-t border-warm-200">
                      {status.nextActions.includes('CONFIRMED') && (
                        <Button size="sm" onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')}>
                          Confirm
                        </Button>
                      )}
                      {status.nextActions.includes('COMPLETED') && (
                        <Button size="sm" onClick={() => handleUpdateStatus(booking.id, 'COMPLETED')}>
                          Mark Complete
                        </Button>
                      )}
                      {status.nextActions.includes('CANCELLED') && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}>
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
