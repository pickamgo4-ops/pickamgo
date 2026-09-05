'use client'

import React from 'react'
import { CheckCircle, Circle, MapPin, Package, Truck, Navigation } from 'lucide-react'
import { RiderDeliveryStatus } from '@/types/rider'
import { DELIVERY_STATUS_FLOW, DELIVERY_STATUS_STEPS } from '@/lib/rider-constants'

const statusIcons: Record<string, any> = {
  ACCEPTED: Package,
  GOING_TO_PICKUP: Navigation,
  ARRIVED_AT_PICKUP: MapPin,
  PICKED_UP: Package,
  OUT_FOR_DELIVERY: Truck,
  IN_TRANSIT: Truck,
  ARRIVED_AT_CUSTOMER: MapPin,
  DELIVERED: CheckCircle,
}

export function DeliveryStatusTimeline({ currentStatus }: { currentStatus: RiderDeliveryStatus }) {
  const activeIndex = DELIVERY_STATUS_STEPS.indexOf(currentStatus as any)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-warm-900">Delivery Progress</h3>
        <span className="text-xs text-warm-800/50">
          {DELIVERY_STATUS_FLOW[currentStatus]?.label || currentStatus}
        </span>
      </div>
      <div className="relative">
        <div
          className="absolute top-4 left-0 right-0 h-0.5 -z-10"
          style={{ backgroundColor: 'var(--tw-warm-200)' }}
        />
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary"
          style={{ width: activeIndex >= 0 ? `${(activeIndex / (DELIVERY_STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
        />

        <div className="flex items-start justify-between">
          {DELIVERY_STATUS_STEPS.map((step, index) => {
            const isActive = index <= Math.max(0, activeIndex)
            const isCurrent = index === activeIndex
            const Icon = statusIcons[step] || Circle
            const stepLabel = DELIVERY_STATUS_FLOW[step]?.label || step

            return (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center mb-2
                    transition-all duration-200
                    ${isActive
                      ? isCurrent
                        ? 'bg-primary text-white ring-2 ring-primary/20 ring-offset-2'
                        : 'bg-primary text-white'
                      : 'bg-warm-100 text-warm-800/40 border border-warm-200'}
                  `}
                >
                  <Icon size={16} />
                </div>
                <span
                  className={`
                    text-center text-xs font-medium
                    ${isCurrent ? 'text-primary' : isActive ? 'text-warm-900' : 'text-warm-800/40'}
                  `}
                >
                  {stepLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function DeliveryActionButtons({
  status,
  onStatusUpdate,
  disabled,
}: {
  status: RiderDeliveryStatus
  onStatusUpdate: (status: RiderDeliveryStatus) => void | Promise<void>
  disabled?: boolean
}) {
  const getNextActions = (currentStatus: RiderDeliveryStatus): RiderDeliveryStatus[] => {
    switch (currentStatus) {
      case 'PENDING': return []
      case 'ACCEPTED': return ['GOING_TO_PICKUP']
      case 'GOING_TO_PICKUP': return ['ARRIVED_AT_PICKUP']
      case 'ARRIVED_AT_PICKUP': return ['PICKED_UP']
      case 'PICKED_UP': return ['OUT_FOR_DELIVERY']
      case 'OUT_FOR_DELIVERY': return ['IN_TRANSIT']
      case 'IN_TRANSIT': return ['ARRIVED_AT_CUSTOMER']
      case 'ARRIVED_AT_CUSTOMER': return []
      default: return []
    }
  }

  const actionLabels: Record<string, string> = {
    GOING_TO_PICKUP: 'Start to Pickup',
    ARRIVED_AT_PICKUP: 'Arrived at Pickup',
    PICKED_UP: 'Picked Up',
    OUT_FOR_DELIVERY: 'Start Delivery',
    IN_TRANSIT: 'In Transit',
    ARRIVED_AT_CUSTOMER: 'Arrived at Customer',
  }

  const nextActions = getNextActions(status)

  if (nextActions.length === 0) return null

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-warm-200">
      {nextActions.map((action) => (
        <button
          key={action}
          onClick={() => onStatusUpdate(action)}
          disabled={disabled}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {actionLabels[action] || action}
        </button>
      ))}
    </div>
  )
}