'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Navigation, Clock, DollarSign, Package, CheckCircle, Circle, Truck } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { RiderProfile, RiderDelivery } from '../../types'
import { mapApiRiderProfileToFrontend, mapApiRiderDeliveryToFrontend } from '../../lib/api-mappers'

export default function RidePage() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(false)
  const [profile, setProfile] = useState<RiderProfile | null>(null)
  const [deliveries, setDeliveries] = useState<RiderDelivery[]>([])
  const [activeDelivery, setActiveDelivery] = useState<RiderDelivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    loadRiderData()
  }, [])

  const loadRiderData = async () => {
    setLoading(true)
    try {
      const [profileRes, deliveriesRes] = await Promise.all([
        api.get<RiderProfile>('/riders/me'),
        api.get<RiderDelivery[]>('/riders/deliveries'),
      ])

      if (profileRes.success && profileRes.data) {
        const mapped = mapApiRiderProfileToFrontend(profileRes.data)
        setProfile(mapped)
        setIsOnline(mapped.isOnline)
      }

      if (deliveriesRes.success && Array.isArray(deliveriesRes.data)) {
        const mapped = deliveriesRes.data.map(mapApiRiderDeliveryToFrontend)
        setDeliveries(mapped)
        const active = mapped.find(d => d.status === 'accepted' || d.status === 'picked_up' || d.status === 'in_transit')
        if (active) {
          setActiveDelivery(active)
        }
      }
    } catch (err) {
      console.error('Failed to load rider data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline
      const response = await api.patch<RiderProfile>('/riders/me', { isOnline: newStatus })
      if (response.success && response.data) {
        setProfile(mapApiRiderProfileToFrontend(response.data))
        setIsOnline(newStatus)
      }
    } catch (err) {
      console.error('Failed to toggle online status:', err)
    }
  }

  const handleAcceptDelivery = async (deliveryId: string) => {
    setAccepting(true)
    try {
      const response = await api.post<RiderDelivery>(`/riders/deliveries/${deliveryId}/accept`, {})
      if (response.success && response.data) {
        const mapped = mapApiRiderDeliveryToFrontend(response.data)
        setActiveDelivery(mapped)
        setDeliveries(prev => prev.filter(d => d.id !== deliveryId))
      }
    } catch (err) {
      console.error('Failed to accept delivery:', err)
    } finally {
      setAccepting(false)
    }
  }

  const handleUpdateStatus = async (deliveryId: string, status: string) => {
    try {
      const response = await api.patch<RiderDelivery>(`/riders/deliveries/${deliveryId}/status`, { status })
      if (response.success && response.data) {
        const mapped = mapApiRiderDeliveryToFrontend(response.data)
        if (status === 'delivered') {
          setActiveDelivery(null)
          setDeliveries(prev => prev.filter(d => d.id !== deliveryId))
        } else {
          setActiveDelivery(mapped)
        }
        if (profile) {
          setProfile({ ...profile, totalEarnings: profile.totalEarnings + (mapped.earnings || 0) })
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading rider dashboard...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Rider Dashboard
            </h1>
            <p className="text-warm-800/60">Manage your deliveries</p>
          </div>
          <button
            onClick={handleToggleOnline}
            className={`relative px-6 py-3 rounded-xl font-semibold transition-all ${
              isOnline
                ? 'bg-green-100 text-green-700 border-2 border-green-200'
                : 'bg-warm-100 text-warm-800 border-2 border-warm-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-warm-800/30'}`} />
              {isOnline ? 'Online' : 'Go Online'}
            </span>
          </button>
        </div>

        {/* Active Delivery */}
        {activeDelivery ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="deal" className="text-sm">Active Delivery</Badge>
              <span className="text-sm text-warm-800/60">
                #{activeDelivery.orderNumber || activeDelivery.orderId?.slice(-6)}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-0.5 h-8 bg-warm-200 my-1" />
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-xs text-warm-800/50 mb-1">Pickup</p>
                    <p className="font-medium text-warm-900">{activeDelivery.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-warm-800/50 mb-1">Drop-off</p>
                    <p className="font-medium text-warm-900">{activeDelivery.dropoffAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-warm-50 rounded-xl mb-4">
              <div>
                <p className="text-sm text-warm-800/60">Earnings</p>
                <p className="text-2xl font-bold text-warm-900">GH₵{activeDelivery.earnings}</p>
              </div>
              <div className="flex gap-2">
                {activeDelivery.status === 'accepted' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(activeDelivery.id, 'picked_up')}
                    icon={<Package size={16} />}
                  >
                    Picked Up
                  </Button>
                )}
                {activeDelivery.status === 'picked_up' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(activeDelivery.id, 'delivered')}
                    icon={<CheckCircle size={16} />}
                  >
                    Delivered
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 text-center">
                <p className="text-2xl font-bold text-warm-900">
                  GH₵{profile?.totalEarnings?.toFixed(0) || '0'}
                </p>
                <p className="text-xs text-warm-800/60 mt-1">Total Earnings</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 text-center">
                <p className="text-2xl font-bold text-warm-900">
                  {profile?.totalDeliveries || 0}
                </p>
                <p className="text-xs text-warm-800/60 mt-1">Deliveries</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 text-center">
                <p className="text-2xl font-bold text-warm-900">
                  {profile?.rating?.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-warm-800/60 mt-1">Rating</p>
              </div>
            </div>

            {/* Available Deliveries */}
            {isOnline && (
              <div>
                <h2 className="font-semibold text-lg text-warm-900 mb-3">
                  Available Deliveries
                </h2>
                {deliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package size={28} className="text-warm-800/30" />
                    </div>
                    <p className="text-warm-800/60">No available deliveries right now</p>
                    <p className="text-sm text-warm-800/50 mt-1">Check back soon!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 hover:border-primary/30 transition-all animate-fade-in"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-warm-900">
                            #{delivery.orderNumber || delivery.orderId?.slice(-6)}
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            +GH₵{delivery.earnings}
                          </span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                            <p className="text-sm text-warm-800/70">{delivery.pickupAddress}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <p className="text-sm text-warm-800/70">{delivery.dropoffAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-warm-800/50">
                            {delivery.distance} · {delivery.estimatedTime}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptDelivery(delivery.id)}
                            disabled={accepting}
                          >
                            {accepting ? 'Accepting...' : 'Accept'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
