'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Upload, MapPin, Settings, Package, FileText } from 'lucide-react'
import { Header } from '../../../../components/layout/Header'
import { BottomNav } from '../../../../components/layout/BottomNav'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Card } from '../../../../components/ui/Card'
import { api } from '../../../../lib/api'

export default function CreateShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    logo: '',
    banner: '',
    location: '',
    area: '',
    campus: '',
    openingHours: '9:00 AM - 6:00 PM',
    category: '',
  })

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
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
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            placeholder="e.g., Campus Glow Beauty"
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

          <Input
            label="Logo URL"
            placeholder="https://example.com/logo.png"
            value={form.logo}
            onChange={(e) => updateField('logo', e.target.value)}
            required
          />

          <Input
            label="Cover Image URL (optional)"
            placeholder="https://example.com/cover.jpg"
            value={form.banner}
            onChange={(e) => updateField('banner', e.target.value)}
          />

          <Input
            label="Location"
            placeholder="e.g., Legon, Accra"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area"
              placeholder="e.g., Legon"
              value={form.area}
              onChange={(e) => updateField('area', e.target.value)}
            />
            <Input
              label="Campus (optional)"
              placeholder="e.g., UG"
              value={form.campus}
              onChange={(e) => updateField('campus', e.target.value)}
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
      </main>

      <BottomNav />
    </div>
  )
}
