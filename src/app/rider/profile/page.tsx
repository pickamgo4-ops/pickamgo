'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Bike, Mail, Phone, MapPin, Shield, CheckCircle, XCircle } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface RiderProfile {
  id: string
  userId: string
  isOnline: boolean
  isAvailable: boolean
  vehicleType?: string
  vehicleNumber?: string
  licenseNumber?: string
  totalDeliveries: number
  rating: number
  totalEarnings: number
  isVerified: boolean
  user: {
    id: string
    name: string
    email: string
    phone: string
    avatar: string
    location: string
  }
}

export default function RiderProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<RiderProfile | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const response = await api.get<RiderProfile>('/riders/me')
      if (response.success && response.data) {
        setProfile(response.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (field: 'isOnline' | 'isAvailable', value: boolean) => {
    try {
      await api.patch('/riders/me/status', { [field]: value })
      setProfile(prev => prev ? { ...prev, [field]: value } : null)
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <RiderSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading profile...</p>
          </div>
        </div>
      </RiderSidebar>
    )
  }

  if (!profile) {
    return (
      <RiderSidebar>
        <div className="text-center py-20">
          <User size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">No rider profile found</h3>
          <p className="text-sm text-warm-800/60">Complete your profile to start delivering</p>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Profile</h1>
          <p className="text-warm-800/60 mt-1">Your rider profile information</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-warm-200 flex-shrink-0">
              {profile.user.avatar ? (
                <img src={profile.user.avatar} alt={profile.user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-warm-800/50">
                  {profile.user.name?.[0] || 'R'}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-warm-900">{profile.user.name}</h2>
              <p className="text-sm text-warm-800/60">{profile.user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={profile.isOnline ? 'verified' : 'default'}>
                  {profile.isOnline ? 'Online' : 'Offline'}
                </Badge>
                <Badge variant={profile.isVerified ? 'verified' : 'deal'}>
                  {profile.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Phone size={18} className="text-warm-800/50" />
              <span className="text-warm-800/70">{profile.user.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail size={18} className="text-warm-800/50" />
              <span className="text-warm-800/70">{profile.user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={18} className="text-warm-800/50" />
              <span className="text-warm-800/70">{profile.user.location || 'Not set'}</span>
            </div>
            {profile.vehicleType && (
              <div className="flex items-center gap-3 text-sm">
                <Bike size={18} className="text-warm-800/50" />
                <span className="text-warm-800/70">{profile.vehicleType}{profile.vehicleNumber ? ` (${profile.vehicleNumber})` : ''}</span>
              </div>
            )}
            {profile.licenseNumber && (
              <div className="flex items-center gap-3 text-sm">
                <Shield size={18} className="text-warm-800/50" />
                <span className="text-warm-800/70">{profile.licenseNumber}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-warm-900 mb-4">Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-warm-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-warm-900">{profile.totalDeliveries}</p>
              <p className="text-xs text-warm-800/60">Deliveries</p>
            </div>
            <div className="p-4 bg-warm-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-warm-900">{(profile.rating || 0).toFixed(1)}</p>
              <p className="text-xs text-warm-800/60">Rating</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-warm-900 mb-4">Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-800/70">Online Status</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isOnline}
                  onChange={(e) => handleStatusToggle('isOnline', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-warm-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-800/70">Available for Deliveries</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isAvailable}
                  onChange={(e) => handleStatusToggle('isAvailable', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-warm-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </RiderSidebar>
  )
}
