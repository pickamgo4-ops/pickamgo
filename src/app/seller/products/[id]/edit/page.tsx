'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [platformCategories, setPlatformCategories] = useState<any[]>([])
  const [form, setForm] = useState<any>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const response = await api.get<any>(`/seller/products/${params.id}`)
      if (!response.success) {
        setError(response.error || 'Product not found')
        return
      }
      const value = response.data
      setProduct(value)
      setForm({
        name: value.name,
        description: value.description,
        price: value.price,
        originalPrice: value.originalPrice || '',
        stock: value.stock,
        categoryId: value.categoryId,
        shopCategoryId: value.shopCategoryId || '',
        location: value.location,
        area: value.area || '',
        condition: value.condition,
        images: value.images?.map((image: any) => image.url).join('\n') || '',
      })
      const [platformResponse, shop] = await Promise.all([
        api.get<any>('/categories'),
        api.get<any>('/seller/shop'),
      ])
      setPlatformCategories(Array.isArray(platformResponse.data) ? platformResponse.data : [])
      if (shop.data?.shop) {
        const categoryResponse = await api.get<any>(`/shop-categories/shops/${shop.data.shop.id}`)
        setCategories(categoryResponse.data || [])
      }
    }
    load()
  }, [params.id])

  const update = (field: string, value: any) => setForm((current: any) => ({ ...current, [field]: value }))

  const uploadImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      setError('')
      try {
        const body = new FormData()
        body.append('image', file)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body,
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const data = await response.json()
        if (data.success) {
          update('images', `${form.images ? `${form.images}\n` : ''}${data.data.url}`)
        } else {
          setError(data.error || 'Image upload failed')
        }
      } catch (err) {
        console.error('Upload fetch error:', err)
        setError(err instanceof Error && err.name === 'AbortError' ? 'Upload timed out. Please try again.' : 'Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }, [form.images])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const response = await api.patch(`/products/${params.id}`, {
      ...form,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      stock: Number(form.stock),
      images: form.images.split('\n').map((url: string) => url.trim()).filter(Boolean),
    })
    if (response.success) {
      router.push('/seller/products')
    } else {
      setError(response.error || 'Could not save product')
    }
    setSaving(false)
  }

  const imageUrls = form.images?.split('\n').map((url: string) => url.trim()).filter(Boolean) || []

  if (!product) {
    return (
      <SellerSidebar>
        <Card className="p-8">{error || 'Loading product...'}</Card>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Edit Product</h1>
          <p className="text-warm-800/60 mt-1">Update catalog information only.</p>
        </div>
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Input label="Product name" value={form.name} onChange={e => update('name', e.target.value)} required />
            <label className="block text-sm font-medium">Description
              <textarea value={form.description} onChange={e => update('description', e.target.value)} className="mt-2 w-full rounded-xl border border-warm-200 p-3" rows={4} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price" type="number" min="0.01" step="0.01" value={form.price} onChange={e => update('price', e.target.value)} required />
              <Input label="Stock" type="number" min="0" value={form.stock} onChange={e => update('stock', e.target.value)} required />
            </div>
            <Input label="Sale/original price" type="number" min="0" step="0.01" value={form.originalPrice} onChange={e => update('originalPrice', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">Platform category
                <select value={form.categoryId} onChange={e => update('categoryId', e.target.value)} className="mt-2 w-full rounded-xl border border-warm-200 p-3" required>
                  <option value="">Select category</option>
                  {platformCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Shop category
                <select value={form.shopCategoryId} onChange={e => update('shopCategoryId', e.target.value)} className="mt-2 w-full rounded-xl border border-warm-200 p-3">
                  <option value="">None</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Product Images</label>
              <div className="flex gap-2 mb-2">
                <Button type="button" variant="outline" onClick={uploadImage} disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
              <textarea
                placeholder="Image URLs, one per line"
                value={form.images}
                onChange={e => update('images', e.target.value)}
                className="mt-2 w-full rounded-xl border border-warm-200 p-3"
                rows={3}
              />
              {imageUrls.length > 0 && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  {imageUrls.map((url: string, index: number) => (
                    <div key={index} className="w-24 h-24 rounded-xl overflow-hidden bg-warm-100 border border-warm-200 relative">
                      <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </SellerSidebar>
  )
}
