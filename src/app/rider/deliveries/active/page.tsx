'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Package, MessageCircle, AlertCircle, Phone, DollarSign } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { RiderLoadingState } from '@/components/RiderAuthGuard'
import { DeliveryStatusTimeline, DeliveryActionButtons } from '@/components/DeliveryStatusTimeline'
import { DeliveryConfirmModal } from '@/components/DeliveryConfirmModal'
import { ReportProblemModal } from '@/components/ReportProblemModal'
import { RiderDeliveryItem } from '@/types/rider'
import dynamic from 'next/dynamic'

const RiderMiniMap = dynamic(() => import('@/components/RiderMiniMap'), { ssr: false })

const statusTransitionMap: Record<string, string[]> = {
  ACCEPTED: ['GOING_TO_PICKUP'],
  GOING_TO_PICKUP: ['ARRIVED_AT_PICKUP'],
  ARRIVED_AT_PICKUP: ['PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['IN_TRANSIT'],
  IN_TRANSIT: ['ARRIVED_AT_CUSTOMER'],
  ARRIVED_AT_CUSTOMER: [],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
}

const actionLabels: Record<string, { label: string; needsVerify?: boolean }> = {
  GOING_TO_PICKUP: { label: 'Start to Pickup' },
  ARRIVED_AT_PICKUP: { label: 'Arrived at Pickup' },
  PICKED_UP: { label: 'Picked Up' },
  OUT_FOR_DELIVERY: { label: 'Start Delivery' },
  IN_TRANSIT: { label: 'In Transit' },
  ARRIVED_AT_CUSTOMER: { label: 'Arrived at Customer', needsVerify: true },
  DELIVERED: { label: 'Mark as Delivered' },
}

export default function RiderActiveDeliveryPage() {
  const router = useRouter()
  const [delivery, setDelivery] = useState<RiderDeliveryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  useEffect(() => {
    loadActiveDelivery()
  }, [])

  const loadActiveDelivery = async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/riders/deliveries')
      if (res.success && res.data) {
        setDelivery(res.data.activeDelivery || null)
      }
    } catch {
      setError('Failed to load active delivery')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status: string) => {
    if (!delivery) return
    setActionLoading(true)
    try {
      const res = await api.updateDeliveryStatus(delivery.id, status)
      if (res.success && res.data) {
        setDelivery(res.data as RiderDeliveryItem)
        if (status === 'DELIVERED') {
          router.push('/rider/deliveries/history')
        }
      } else {
        setError(res.error || 'Failed to update status')
      }
    } catch {
      setError('Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerify = async (code: string) => {
    if (!delivery) return { success: false, error: 'No active delivery' }
    try {
      const res = await api.verifyDelivery(delivery.id, code)
      if (res.success && res.data) {
        setDelivery(res.data as RiderDeliveryItem)
        setConfirmModalOpen(false)
        router.push('/rider/deliveries/history')
        return { success: true }
      }
      return { success: false, error: res.error || 'Failed to verify delivery' }
    } catch {
      return { success: false, error: 'Failed to verify delivery' }
    }
  }

  const handleReportProblem = async (data: { reason: string; description?: string }) => {
    if (!delivery) return { success: false, error: 'No active delivery' }
    try {
      const res = await api.reportDeliveryProblem(delivery.id, data)
      if (res.success) {
        setReportModalOpen(false)
        return { success: true }
      }
      return { success: false, error: res.error || 'Failed to report problem' }
    } catch {
      return { success: false, error: 'Failed to report problem' }
    }
  }

  const getStatusTransitions = (currentStatus: string): string[] => {
    return statusTransitionMap[currentStatus] || []
  }

  if (loading) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading active delivery..." />
      </RiderSidebar>
    )
  }

  if (!delivery) {
    return (
      <RiderSidebar>
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-2">No active delivery</h3>
          <p className="text-sm text-warm-800/60 mb-4">Accept a delivery to get started</p>
          <Button onClick={() => router.push('/rider/deliveries/available')}>
            Find Deliveries
          </Button>
        </div>
      </RiderSidebar>
    )
  }

  const order = delivery.order
  const nextActions = getStatusTransitions(delivery.status)
  const showConfirmModal = nextActions.includes('ARRIVED_AT_CUSTOMER')

  const pickup = delivery.pickupLatitude != null && delivery.pickupLongitude != null
    ? { lat: delivery.pickupLatitude, lng: delivery.pickupLongitude }
    : undefined
  const dropoff = delivery.dropoffLatitude != null && delivery.dropoffLongitude != null
    ? { lat: delivery.dropoffLatitude, lng: delivery.dropoffLongitude }
    : undefined

  return (
    <RiderSidebar>
      <div className="space-y-6 max-w-3xl mx-auto w-full min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Active Delivery</h1>
            <p className="text-warm-800/60 mt-1">
              Order #{delivery.orderNumber || order?.orderNumber || delivery.orderId.slice(-6)}
            </p>
          </div>
          <Badge variant="delivery" className="text-sm">
            {delivery.status}
          </Badge>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Status Timeline */}
        <Card className="p-6">
          <DeliveryStatusTimeline currentStatus={delivery.status} />
        </Card>

        {/* Map */}
        {pickup && dropoff && (
          <Card className="p-4">
            <h2 className="font-semibold text-warm-900 mb-3">Delivery Route</h2>
            <div className="rounded-xl overflow-hidden border border-warm-200 h-48">
              <RiderMiniMap pickup={pickup} dropoff={dropoff} height="192px" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-warm-50 p-3">
                <p className="text-xs text-warm-800/60">Pickup Address</p>
                <p className="font-medium text-warm-900">{delivery.pickupAddress}</p>
              </div>
              <div className="rounded-xl bg-warm-50 p-3">
                <p className="text-xs text-warm-800/60">Dropoff Address</p>
                <p className="font-medium text-warm-900">{delivery.dropoffAddress}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Earnings */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-warm-800/60">Delivery Earnings</p>
              <p className="text-2xl font-bold text-green-600 mt-1">GH₵{Number(delivery.riderEarnings || 0).toFixed(2)}</p>
              {delivery.distance && <p className="text-xs text-warm-800/50 mt-1">{delivery.distance} • Est. {delivery.estimatedTime || '—'}</p>}
            </div>
            {delivery.riderEarningsRecord && (
              <div className="text-right">
                <Badge variant={delivery.riderEarningsRecord.status === 'AVAILABLE' ? 'verified' : 'deal'}>
                  {delivery.riderEarningsRecord.status}
                </Badge>
                {delivery.riderEarningsRecord.availableAt && (
                  <p className="text-xs text-warm-800/50 mt-1">
                    Available {new Date(delivery.riderEarningsRecord.availableAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Customer Info */}
        {order?.customer && (
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-warm-900 mb-4">Customer</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar src={order?.customer?.avatar} alt={order?.customer?.name || 'Customer'} fallback={(order?.customer?.name || 'C').charAt(0).toUpperCase()} className="w-12 h-12" />
                <div>
                  <p className="font-medium text-warm-900">{order.customer.name}</p>
                  {order.customer.location && <p className="text-sm text-warm-800/60">{order.customer.location}</p>}
                </div>
              </div>
              {order.customer.phone && (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="p-3 bg-warm-50 rounded-xl text-primary hover:bg-warm-100 transition-colors"
                >
                  <Phone size={20} />
                </a>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-warm-200">
              <button
                onClick={() => router.push(`/messages/${order?.customer?.id}?orderId=${delivery.orderId}`)}
                className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-2"
              >
                <MessageCircle size={16} />
                Message Customer
              </button>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-warm-900 mb-4">Next Steps</h2>

          {(nextActions.length > 0 || delivery.status === 'ARRIVED_AT_CUSTOMER') && (
            <DeliveryActionButtons
              status={delivery.status}
              onStatusUpdate={handleStatusUpdate}
              disabled={actionLoading}
            />
          )}

          {delivery.status === 'ARRIVED_AT_CUSTOMER' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Verification Code</p>
                  <p className="text-sm text-blue-700">
                    Show the customer the 4-digit code or ask them to confirm it.
                  </p>
                </div>
              </div>
              <Button
                fullWidth
                loading={actionLoading}
                onClick={() => setConfirmModalOpen(true)}
                icon={<Package size={18} />}
              >
                Confirm Delivery
              </Button>
            </div>
          )}

          {delivery.status === 'ARRIVED_AT_CUSTOMER' && (
            <button
              onClick={() => setReportModalOpen(true)}
              className="mt-3 w-full text-warm-800/60 hover:text-red-600 font-medium text-sm py-2 flex items-center justify-center gap-2"
            >
              <AlertCircle size={16} />
              Report a Problem
            </button>
          )}
        </Card>

        {/* Verification Modal */}
        {confirmModalOpen && (
          <DeliveryConfirmModal
            deliveryId={delivery.id}
            orderId={delivery.orderId}
            orderNumber={delivery.orderNumber || order?.orderNumber}
            onComplete={handleVerify}
            onCancel={() => setConfirmModalOpen(false)}
          />
        )}

        {/* Report Problem Modal */}
        <ReportProblemModal
          deliveryId={delivery.id}
          orderId={delivery.orderId}
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleReportProblem}
        />
      </div>
    </RiderSidebar>
  )
}
