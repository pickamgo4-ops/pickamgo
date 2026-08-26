'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Moon, Sun, Globe, Shield } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { useRole } from '../../contexts/RoleContext'
import { ThemeProvider, useTheme } from '../../components/theme/ThemeProvider'
import { NotificationPreferences } from '../../types'

const PREFERENCE_OPTIONS = [
  { key: 'orderUpdates' as keyof NotificationPreferences, label: 'Order updates', description: 'Get notified about your order status changes' },
  { key: 'shopUpdates' as keyof NotificationPreferences, label: 'Followed shop updates', description: 'New products and updates from shops you follow' },
  { key: 'dealsAndPromotions' as keyof NotificationPreferences, label: 'Deals and promotions', description: 'Exclusive discounts and special offers' },
  { key: 'deliveryUpdates' as keyof NotificationPreferences, label: 'Delivery updates', description: 'Rider location and delivery notifications' },
  { key: 'beautyServices' as keyof NotificationPreferences, label: 'Beauty services', description: 'New beauty services and availability updates' },
]

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  shopUpdates: true,
  dealsAndPromotions: true,
  deliveryUpdates: true,
  beautyServices: true,
}

function SettingsContent() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const { theme, setTheme } = useTheme()
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!authInitialized) return
    if (!user) router.push('/auth/login')
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
    } catch {
      // keep defaults
    } finally {
      setPrefsLoading(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await api.post('/notifications/preferences', preferences)
      if (response.success) {
        setSaved(true)
        setMessage({ type: 'success', text: 'Notification preferences saved' })
        setTimeout(() => setSaved(false), 3000)
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save preferences' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !authInitialized || !user) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading settings...</p>
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
              Settings
            </h1>
            <p className="text-warm-800/60">Manage your account preferences</p>
          </div>
        </div>

        {message && (
          <Card className={`mb-6 p-4 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {theme === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
              <h3 className="font-semibold text-warm-900">Appearance</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-900">Dark Mode</p>
                <p className="text-xs text-warm-800/60">Switch between light and dark themes</p>
              </div>
              <Button variant="outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Notification Preferences</h3>
            </div>
            <p className="text-xs text-warm-800/60 mb-4">These settings control non-essential notifications. Critical security and account emails are always sent.</p>
            <div className="space-y-3 mb-6">
              {PREFERENCE_OPTIONS.map((option) => (
                <div key={option.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-warm-900 text-sm">{option.label}</h4>
                    <p className="text-xs text-warm-800/60">{option.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(option.key)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${preferences[option.key] ? 'bg-primary' : 'bg-warm-200'}`}
                  >
                    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${preferences[option.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
            <Button fullWidth onClick={handleSavePreferences} disabled={saving}>
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Account</h3>
            </div>
            <div className="space-y-3">
              <Button variant="outline" fullWidth onClick={() => router.push('/security')}>Account & Security</Button>
              <Button variant="outline" fullWidth onClick={() => router.push('/help')}>Help & Support</Button>
            </div>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ThemeProvider>
      <SettingsContent />
    </ThemeProvider>
  )
}
