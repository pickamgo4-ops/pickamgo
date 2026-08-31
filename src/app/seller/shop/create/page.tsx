'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Upload, MapPin } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Card } from '../../../../components/ui/Card'
import { api } from '../../../../lib/api'
import dynamic from 'next/dynamic'

const GoogleLocationPicker = dynamic(() => import('@/components/map/GoogleLocationPicker'), { ssr: false })

export default function CreateShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    logo: '',
    banner: '',
    location: '',
    area: '',
    openingHours: '9:00 AM - 6:00 PM',
    category: '',
    latitude: null as number | null,
    longitude: null as number | null,
  })

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const uploadImage = async (field: 'logo' | 'banner') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(field)
      try {
        const body = new FormData()
        body.append('image', file)
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body,
        })
        const data = await response.json().catch(() => null)
        if (response.ok && data?.success) {
          updateField(field, data.data.url)
        } else {
          setError(data?.error || `Image upload failed (${response.status || 'request'}). Please try again.`)
        }
      } catch {
        setError('Upload failed. Please try again.')
      } finally {
        setUploading(null)
      }
    }
    input.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post<any>('/shops', form)
      if (response.success && response.data) {
        router.push('/seller/shop/settings')
      } else {
        setError(response.error || 'Failed to create shop')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Store size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Create Your Shop
            </h1>
            <p className="text-warm-800/60 text-sm">Set up your shop to start selling</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Shop Name"
            placeholder="e.g., Glow Beauty"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">Description</label>
            <textarea
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              rows={3}
              placeholder="Describe your shop..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">Logo</label>
            <div className="flex gap-2 mb-2">
              <Button type="button" variant="outline" onClick={() => uploadImage('logo')} disabled={uploading === 'logo'} className="flex-1">
                {uploading === 'logo' ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
            <Input
              placeholder="Or paste logo URL (https://example.com/logo.png)"
              value={form.logo}
              onChange={(e) => updateField('logo', e.target.value)}
            />
            {form.logo && (
              <div className="mt-3 w-20 h-20 rounded-xl overflow-hidden bg-warm-200 border border-warm-200">
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
              placeholder="Or paste cover image URL (https://example.com/cover.jpg)"
              value={form.banner}
              onChange={(e) => updateField('banner', e.target.value)}
            />
            {form.banner && (
              <div className="mt-3 w-full h-32 rounded-xl overflow-hidden bg-warm-200 border border-warm-200">
                <img src={form.banner} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <Input
            label="Location"
            placeholder="e.g., Legon, Accra"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            required
          />

          <GoogleLocationPicker
            value={{ address: form.location, latitude: form.latitude ?? undefined, longitude: form.longitude ?? undefined }}
            onChange={(result) => setForm(prev => ({ ...prev, location: result.address, latitude: result.latitude, longitude: result.longitude }))}
            placeholder="Search and confirm your shop location in Ghana"
            height="260px"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area"
              placeholder="e.g., Legon"
              value={form.area}
              onChange={(e) => updateField('area', e.target.value)}
            />
          </div>

          <Input
            label="Opening Hours"
            placeholder="e.g., 9:00 AM - 6:00 PM"
            value={form.openingHours}
            onChange={(e) => updateField('openingHours', e.target.value)}
            required
          />

          <Input
            label="Business Category"
            placeholder="e.g., Beauty, Food, Fashion"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            required
          />

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating Shop...' : 'Create Shop'}
          </Button>
        </form>
      </div>
    </SellerSidebar>
  )
}
