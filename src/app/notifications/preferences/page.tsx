'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ArrowLeft, Check } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'
import { NotificationPreferences } from '../../../types'
import { useRole } from '../../../contexts/RoleContext'

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  shopUpdates: true,
  dealsAndPromotions: true,
  deliveryUpdates: true,
  beautyServices: true,
}

const PREFERENCE_OPTIONS = [
  { key: 'orderUpdates' as keyof NotificationPreferences, label: 'Order updates', description: 'Get notified about your order status changes' },
  { key: 'shopUpdates' as keyof NotificationPreferences, label: 'Followed shop updates', description: 'New products and updates from shops you follow' },
  { key: 'dealsAndPromotions' as keyof NotificationPreferences, label: 'Deals and promotions', description: 'Exclusive discounts and special offers' },
  { key: 'deliveryUpdates' as keyof NotificationPreferences, label: 'Delivery updates', description: 'Rider location and delivery notifications' },
  { key: 'beautyServices' as keyof NotificationPreferences, label: 'Beauty services', description: 'New beauty services and availability updates' },
]

export default function NotificationPreferencesPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user) {
      router.push('/auth/login')
    }
  }, [user, authInitialized, router])

  useEffect(() => {
    if (!user) return
    loadPreferences()
  }, [user])

  const loadPreferences = async () => {
    setPrefsLoading(true)
    try {
      const response = await api.get<NotificationPreferences>('/notifications/preferences')
      if (response.success && response.data) {
        setPreferences(response.data)
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
    } finally {
      setPrefsLoading(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await api.post('/notifications/preferences', preferences)
      if (response.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  if (prefsLoading || loading || !authInitialized || !user) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading preferences...</p>
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
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ArrowLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Notification Preferences
            </h1>
            <p className="text-warm-800/60">Manage how you receive notifications</p>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bell size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-warm-900">Push Notifications</h3>
              <p className="text-xs text-warm-800/60">Choose what notifications you want to receive</p>
            </div>
          </div>
        </Card>

        <div className="space-y-3 mb-6">
          {PREFERENCE_OPTIONS.map((option) => (
            <Card key={option.key} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-warm-900 text-sm">{option.label}</h4>
                  <p className="text-xs text-warm-800/60 mt-0.5">{option.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(option.key)}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    preferences[option.key] ? 'bg-primary' : 'bg-warm-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      preferences[option.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Button
          fullWidth
          onClick={handleSave}
          disabled={saving}
          className="mb-4"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
        </Button>

        {saved && (
          <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
            <Check size={16} />
            <span>Preferences saved successfully</span>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
