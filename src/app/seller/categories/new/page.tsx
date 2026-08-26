'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tag } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function CreateCategoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shopId, setShopId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    image: '',
  })

  useEffect(() => {
    loadShop()
  }, [])

  const loadShop = async () => {
    try {
      const response = await api.get<any>('/seller/shop')
      if (response.success && response.data?.shop) {
        setShopId(response.data.shop.id)
      }
    } catch (err) {
      console.error('Failed to load shop:', err)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopId) {
      setError('No shop found. Please create a shop first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post<any>(`/shop-categories/shops/${shopId}`, form)
      if (response.success && response.data) {
        router.push('/seller/onboarding')
      } else {
        setError(response.error || 'Failed to create category')
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
            <Tag size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Create Category
            </h1>
            <p className="text-warm-800/60 text-sm">Add a category to organize your products</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g., Gel Nails, Burgers, T-Shirts"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">Description (optional)</label>
            <textarea
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              rows={2}
              placeholder="Describe this category..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <Input
            label="Image URL (optional)"
            placeholder="https://example.com/category-image.png"
            value={form.image}
            onChange={(e) => updateField('image', e.target.value)}
          />

          <Button type="submit" fullWidth disabled={loading || !shopId}>
            {loading ? 'Creating...' : 'Create Category'}
          </Button>
        </form>
      </div>
    </SellerSidebar>
  )
}
