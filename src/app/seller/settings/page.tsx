'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Save, MapPin, Phone, Mail, Clock, Truck } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

export default function SellerSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shop, setShop] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    logo: '',
    banner: '',
    location: '',
    area: '',
    openingHours: '',
    phone: '',
    email: '',
    deliveryFee: 0,
    deliveryAvailable: true,
    pickupAvailable: true,
    isOpen: true,
  })

  useEffect(() => {
    loadShop()
  }, [])

  const loadShop = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/seller/shop')
      if (response.success && response.data?.shop) {
        const s = response.data.shop
        setShop(s)
        setForm({
          name: s.name || '',
          description: s.description || '',
          logo: s.logo || '',
          banner: s.banner || '',
          location: s.location || '',
          area: s.area || '',
          openingHours: s.openingHours || '',
          phone: s.phone || '',
          email: s.email || '',
          deliveryFee: s.deliveryFee || 0,
          deliveryAvailable: s.deliveryAvailable ?? true,
          pickupAvailable: s.pickupAvailable ?? true,
          isOpen: s.isOpen ?? true,
        })
      }
    } catch {
      setError('Failed to load shop settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop?.id) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.patch(`/shops/${shop.id}`, form)
      if (response.success) {
        setSuccess('Settings saved successfully')
        setShop(response.data)
      } else {
        setError(response.error || 'Failed to save settings')
      }
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading settings...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  if (!shop) {
    return (
      <SellerSidebar>
        <div className="text-center py-20">
          <Store size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">No shop found</h3>
          <p className="text-sm text-warm-800/60 mb-4">Create a shop first to manage settings</p>
          <Button onClick={() => router.push('/seller/shop/create')}>Create Shop</Button>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Shop Settings</h1>
          <p className="text-warm-800/60 mt-1">Manage your shop information</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-warm-900 flex items-center gap-2">
              <Store size={18} className="text-primary" />
              Basic Information
            </h3>
            <Input
              label="Shop Name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-warm-900 mb-1.5">Description</label>
              <textarea
                className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                required
              />
            </div>
            <Input
              label="Logo URL"
              value={form.logo}
              onChange={(e) => updateField('logo', e.target.value)}
            />
            <Input
              label="Banner URL (optional)"
              value={form.banner}
              onChange={(e) => updateField('banner', e.target.value)}
            />
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-warm-900 flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              Location
            </h3>
            <Input
              label="Address"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Area"
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-warm-900 flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              Operating Hours
            </h3>
            <Input
              label="Opening Hours"
              placeholder="e.g., Mon-Fri 8am-6pm, Sat 9am-4pm"
              value={form.openingHours}
              onChange={(e) => updateField('openingHours', e.target.value)}
              required
            />
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-warm-900 flex items-center gap-2">
              <Truck size={18} className="text-primary" />
              Delivery & Pickup
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">Delivery Fee (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.deliveryFee}
                  onChange={(e) => updateField('deliveryFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.deliveryAvailable}
                  onChange={(e) => updateField('deliveryAvailable', e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-warm-200"
                />
                <span className="text-sm text-warm-900">Delivery Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pickupAvailable}
                  onChange={(e) => updateField('pickupAvailable', e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-warm-200"
                />
                <span className="text-sm text-warm-900">Pickup Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => updateField('isOpen', e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-warm-200"
                />
                <span className="text-sm text-warm-900">Shop Open</span>
              </label>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Badge variant={shop.status === 'ACTIVE' ? 'verified' : 'deal'}>
              {shop.status === 'ACTIVE' ? 'Active' : shop.status}
            </Badge>
            <Button type="submit" disabled={saving} icon={<Save size={18} />}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </SellerSidebar>
  )
}
