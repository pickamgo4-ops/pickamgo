'use client'

import React, { useState, useEffect } from 'react'
import { Truck, Store, Bike, Save } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'

export default function DeliverySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState({
    deliveryAvailable: true,
    pickupAvailable: true,
    sellerDeliveryAvailable: false,
    platformDeliveryFee: 10,
    sellerDeliveryFee: 0,
    pickupInstructions: '',
    deliveryZones: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/seller/delivery-settings')
      if (response.success && response.data) {
        setSettings({
          deliveryAvailable: response.data.deliveryAvailable ?? true,
          pickupAvailable: response.data.pickupAvailable ?? true,
          sellerDeliveryAvailable: response.data.sellerDeliveryAvailable ?? false,
          platformDeliveryFee: response.data.platformDeliveryFee ?? 10,
          sellerDeliveryFee: response.data.sellerDeliveryFee ?? 0,
          pickupInstructions: response.data.pickupInstructions || '',
          deliveryZones: response.data.deliveryZones || '',
        })
      }
    } catch (error) {
      console.error('Failed to load delivery settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const response = await api.patch('/seller/delivery-settings', settings)
      if (response.success) {
        setMessage({ type: 'success', text: 'Delivery settings saved' })
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading delivery settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="font-display text-2xl font-bold text-warm-900 mb-6">Delivery Settings</h1>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-warm-200">
            <h2 className="font-semibold text-warm-900 mb-3">Fulfillment Methods</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={settings.deliveryAvailable} onChange={(e) => setSettings({ ...settings, deliveryAvailable: e.target.checked })} className="w-5 h-5 rounded border-warm-200 text-primary focus:ring-primary" />
                <div className="flex items-center gap-2">
                  <Truck size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-warm-900">PickAmGo Delivery</p>
                    <p className="text-xs text-warm-800/60">Use platform riders for delivery</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={settings.sellerDeliveryAvailable} onChange={(e) => setSettings({ ...settings, sellerDeliveryAvailable: e.target.checked })} className="w-5 h-5 rounded border-warm-200 text-primary focus:ring-primary" />
                <div className="flex items-center gap-2">
                  <Bike size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-warm-900">My Own Delivery</p>
                    <p className="text-xs text-warm-800/60">Handle delivery yourself</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={settings.pickupAvailable} onChange={(e) => setSettings({ ...settings, pickupAvailable: e.target.checked })} className="w-5 h-5 rounded border-warm-200 text-primary focus:ring-primary" />
                <div className="flex items-center gap-2">
                  <Store size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-warm-900">Customer Pickup</p>
                    <p className="text-xs text-warm-800/60">Allow customers to pick up orders</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {settings.deliveryAvailable && (
            <div className="bg-white rounded-2xl p-4 border border-warm-200">
              <h2 className="font-semibold text-warm-900 mb-3">Platform Delivery</h2>
              <Input label="Platform Delivery Fee (GHS)" type="number" value={String(settings.platformDeliveryFee)} onValueChange={(val) => setSettings({ ...settings, platformDeliveryFee: parseFloat(val) || 0 })} min="0" />
            </div>
          )}

          {settings.sellerDeliveryAvailable && (
            <div className="bg-white rounded-2xl p-4 border border-warm-200">
              <h2 className="font-semibold text-warm-900 mb-3">Seller Delivery</h2>
              <Input label="Seller Delivery Fee (GHS)" type="number" value={String(settings.sellerDeliveryFee)} onValueChange={(val) => setSettings({ ...settings, sellerDeliveryFee: parseFloat(val) || 0 })} min="0" />
            </div>
          )}

          {settings.pickupAvailable && (
            <div className="bg-white rounded-2xl p-4 border border-warm-200">
              <h2 className="font-semibold text-warm-900 mb-3">Pickup</h2>
              <label className="block text-sm font-medium text-warm-900 mb-2">Pickup Instructions</label>
              <textarea
                value={settings.pickupInstructions}
                onChange={(e) => setSettings({ ...settings, pickupInstructions: e.target.value })}
                placeholder="e.g. Pick up from the main entrance, call when arriving"
                className="w-full p-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-warm-200">
            <h2 className="font-semibold text-warm-900 mb-3">Delivery Zones</h2>
            <label className="block text-sm font-medium text-warm-900 mb-2">Areas you deliver to (optional)</label>
            <textarea
              value={settings.deliveryZones}
              onChange={(e) => setSettings({ ...settings, deliveryZones: e.target.value })}
              placeholder="e.g. Legon, Madina, Accra Central"
              className="w-full p-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={3}
            />
          </div>

          <Button fullWidth type="submit" disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  )
}
