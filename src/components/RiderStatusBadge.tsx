'use client'

import { Dot } from 'lucide-react'
import { DELIVERY_STATUS_FLOW, getRiderStatus } from '@/lib/rider-constants'
import { RiderDeliveryStatus } from '@/types/rider'

export function RiderStatusBadge({ rider }: { rider: { isOnline: boolean; isAvailable: boolean; activeDelivery?: any } }) {
  const { status, label, color } = getRiderStatus(rider)
  const dotColorMap: Record<string, string> = {
    on_delivery: 'text-purple-500',
    online: 'text-green-500',
    offline: 'text-warm-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      <Dot size={12} className={dotColorMap[status]} />
      {label}
    </span>
  )
}

export function DeliveryStatusBadge({ status }: { status: RiderDeliveryStatus }) {
  const config = DELIVERY_STATUS_FLOW[status] || { label: status, icon: null }
  const colorMap: Record<string, string> = {
    PENDING: 'bg-warm-100 text-warm-700',
    ACCEPTED: 'bg-blue-100 text-blue-700',
    GOING_TO_PICKUP: 'bg-blue-100 text-blue-700',
    ARRIVED_AT_PICKUP: 'bg-purple-100 text-purple-700',
    PICKED_UP: 'bg-purple-100 text-purple-700',
    OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
    IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
    ARRIVED_AT_CUSTOMER: 'bg-orange-100 text-orange-700',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
    FAILED: 'bg-red-100 text-red-700',
  }
  const color = colorMap[status] || 'bg-warm-100 text-warm-700'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {config.label}
    </span>
  )
}
