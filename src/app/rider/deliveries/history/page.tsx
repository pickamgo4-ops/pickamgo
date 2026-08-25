'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

interface Delivery {
  id: string
  orderId: string
  orderNumber?: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  riderEarnings: number
  createdAt: string
  deliveredAt?: string
}

export default function RiderDeliveryHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/riders/deliveries/history')
      if (response.success && response.data) {
        setDeliveries(response.data.deliveries || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const filteredDeliveries = filter ? deliveries.filter(d => d.status === filter) : deliveries

  const statusConfig: Record<string, { label: string; color: string }> = {
    ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-700' },
    PICKED_UP: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700' },
    DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  }

  if (loading) {
    return (
      <RiderSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading delivery history...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Delivery History</h1>
          <p className="text-warm-800/60 mt-1">{deliveries.length} deliveries</p>
        </div>

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

        {filteredDeliveries.length === 0 ? (
          <Card className="p-12 text-center">
            <Package size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No deliveries yet</h3>
            <p className="text-sm text-warm-800/60">Your delivery history will appear here</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDeliveries.map((delivery) => {
              const status = statusConfig[delivery.status] || { label: delivery.status, color: 'bg-gray-100 text-gray-700' }
              return (
                <Card key={delivery.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-warm-900">#{delivery.orderNumber || delivery.orderId?.slice(-6)}</h3>
                      <p className="text-xs text-warm-800/60">
                        {new Date(delivery.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={status.color.includes('green') ? 'verified' : status.color.includes('red') ? 'deal' : 'default'}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-warm-800/70">
                      <span className="text-xs font-medium text-warm-800/50 w-16">From:</span>
                      {delivery.pickupAddress}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-warm-800/70">
                      <span className="text-xs font-medium text-warm-800/50 w-16">To:</span>
                      {delivery.dropoffAddress}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-warm-200">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign size={16} className="text-green-500" />
                      <span className="font-bold text-green-600">GH₵{delivery.riderEarnings?.toFixed(2) || '0.00'}</span>
                    </div>
                    {delivery.deliveredAt && (
                      <span className="text-xs text-warm-800/50">
                        Delivered {new Date(delivery.deliveredAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </RiderSidebar>
  )
}
