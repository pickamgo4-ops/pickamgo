'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Upload, MapPin, Truck, Settings, Copy, ExternalLink } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { getShopUrl } from '@/lib/shop-url'
import dynamic from 'next/dynamic'

const GoogleLocationPicker = dynamic(() => import('@/components/map/GoogleLocationPicker'), { ssr: false })

export default function ShopSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shop, setShop] = useState<any>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  const [form, setForm] = useState({
    logo: '',
    banner: '',
    location: '',
    area: '',
    latitude: null as number | null,
    longitude: null as number | null,
    openingHours: '9:00 AM - 6:00 PM',
    deliveryAvailable: true,
    pickupAvailable: true,
    deliveryFee: '0',
  })

  useEffect(() => {
    loadShop()
  }, [])

  const loadShop = async () => {
    try {
      const response = await api.get<any>('/seller/shop')
      if (response.success && response.data?.shop) {
        const shopData = response.data.shop
        setShop(shopData)
        setForm({
          logo: shopData.logo || '',
          banner: shopData.banner || '',
          location: shopData.location || '',
          area: shopData.area || '',
          latitude: shopData.latitude ?? null,
          longitude: shopData.longitude ?? null,
          openingHours: shopData.openingHours || '9:00 AM - 6:00 PM',
          deliveryAvailable: shopData.deliveryAvailable ?? true,
          pickupAvailable: shopData.pickupAvailable ?? true,
          deliveryFee: shopData.deliveryFee?.toString() || '0',
        })
      } else {
        router.push('/seller/shop/create')
      }
    } catch (err) {
      router.push('/seller/shop/create')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const uploadImage = useCallback(async (field: 'logo' | 'banner') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(field)
      setError('')
      try {
        const body = new FormData()
        body.append('image', file)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body,
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const data = await response.json().catch(() => null)
        if (response.ok && data?.success) {
          updateField(field, data.data.url)
        } else {
          setError(data?.error || `Image upload failed (${response.status || 'request'}). Please try again.`)
        }
      } catch (err) {
        console.error('Upload fetch error:', err)
        setError(err instanceof Error && err.name === 'AbortError' ? 'Upload timed out. Please try again.' : 'Upload failed. Please try again.')
      } finally {
        setUploading(null)
      }
    }
    input.click()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.patch<any>(`/shops/${shop.id}`, {
        ...form,
        latitude: form.latitude,
        longitude: form.longitude,
        deliveryFee: parseFloat(form.deliveryFee) || 0,
      })

      if (response.success && response.data) {
        setShop(response.data)
        setSuccess('Settings saved successfully!')
        setTimeout(() => router.push('/seller/onboarding'), 1000)
      } else {
        setError(response.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading shop...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Settings size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Shop Settings
            </h1>
            <p className="text-warm-800/60 text-sm">Update your shop information</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        {shop && shop.slug && (
          <Card className="p-4 mb-6">
            <p className="text-xs text-warm-800/60 mb-1">Your public shop URL</p>
            <p className="text-sm font-medium text-warm-900 break-all">
              {getShopUrl(shop.slug)}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = getShopUrl(shop.slug)
                  navigator.clipboard.writeText(url)
                }}
                icon={<Copy size={15} />}
              >
                Copy URL
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const url = getShopUrl(shop.slug)
                  window.open(url, '_blank', 'noopener,noreferrer')
                }}
                icon={<ExternalLink size={15} />}
              >
                Open
              </Button>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Shop Photos</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">Logo</label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" onClick={() => uploadImage('logo')} disabled={uploading === 'logo'} className="flex-1">
                    {uploading === 'logo' ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
                <Input
                  placeholder="Or paste logo URL"
                  value={form.logo}
                  onChange={(e) => updateField('logo', e.target.value)}
                />
                {form.logo && (
                  <div className="mt-3 w-20 h-20 rounded-xl overflow-hidden bg-warm-200">
                    <img src={form.logo} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">Cover Image</label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" onClick={() => uploadImage('banner')} disabled={uploading === 'banner'} className="flex-1">
                    {uploading === 'banner' ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
                <Input
                  placeholder="Or paste cover image URL"
                  value={form.banner}
                  onChange={(e) => updateField('banner', e.target.value)}
                />
                {form.banner && (
                  <div className="mt-3 w-full h-32 rounded-xl overflow-hidden bg-warm-200">
                    <img src={form.banner} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Location Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Location</h3>
            </div>
              <div className="space-y-4">
                <Input
                  label="Address"
                  placeholder="e.g., Legon, Accra"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                />
                <GoogleLocationPicker
                  value={{ address: form.location, latitude: form.latitude ?? undefined, longitude: form.longitude ?? undefined }}
                  onChange={(result) => {
                    updateField('location', result.address)
                    updateField('latitude', result.latitude)
                    updateField('longitude', result.longitude)
                  }}
                  placeholder="Search shop address in Ghana"
                  height="280px"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Area"
                    placeholder="e.g., Legon"
                    value={form.area}
                    onChange={(e) => updateField('area', e.target.value)}
                  />
                </div>
              </div>
          </Card>

          {/* Delivery Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Delivery Options</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="deliveryAvailable"
                  checked={form.deliveryAvailable}
                  onChange={(e) => updateField('deliveryAvailable', e.target.checked)}
                  className="w-5 h-5 rounded border-warm-200 text-primary focus:ring-primary"
                />
                <label htmlFor="deliveryAvailable" className="text-sm text-warm-900">
                  Enable Delivery
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pickupAvailable"
                  checked={form.pickupAvailable}
                  onChange={(e) => updateField('pickupAvailable', e.target.checked)}
                  className="w-5 h-5 rounded border-warm-200 text-primary focus:ring-primary"
                />
                <label htmlFor="pickupAvailable" className="text-sm text-warm-900">
                  Enable Pickup
                </label>
              </div>
              <Input
                label="Delivery Fee (GH₵)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.deliveryFee}
                onChange={(e) => updateField('deliveryFee', e.target.value)}
              />
              <Input
                label="Opening Hours"
                placeholder="9:00 AM - 6:00 PM"
                value={form.openingHours}
                onChange={(e) => updateField('openingHours', e.target.value)}
              />
            </div>
          </Card>

          <Button type="submit" fullWidth disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </div>
    </SellerSidebar>
  )
}
