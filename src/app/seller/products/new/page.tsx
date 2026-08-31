'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, Trash2, Hash, FileText, Tag } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Card } from '../../../../components/ui/Card'
import { api } from '../../../../lib/api'

interface Variant {
  name: string
  sku: string
  price: string
  stock: string
  image: string
}

export default function CreateProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [shopId, setShopId] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [shopCategories, setShopCategories] = useState<any[]>([])
  const [platformCategories, setPlatformCategories] = useState<any[]>([])
  const [isDraft, setIsDraft] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    sku: '',
    brand: '',
    price: '',
    originalPrice: '',
    stock: '',
    categoryId: '',
    shopCategoryId: '',
    location: '',
    area: '',
    condition: 'new',
    images: '',
  })

  const [variants, setVariants] = useState<Variant[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const shopRes = await api.get<any>('/seller/shop')
      if (shopRes.success && shopRes.data?.shop) {
        const shop = shopRes.data.shop
        setShopId(shop.id)
        setForm(prev => ({ ...prev, location: shop.location || '', area: shop.area || '' }))
        const [categoriesRes, shopCategoriesRes] = await Promise.all([
          api.get<any>('/categories'),
          api.get<any>(`/shop-categories/shops/${shop.id}`),
        ])
        if (categoriesRes.success) { const platform = (Array.isArray(categoriesRes.data) ? categoriesRes.data : []).map((category: any) => ({ ...category, platform: true })); setPlatformCategories(platform); setCategories(platform) }
        if (shopCategoriesRes.success) { setShopCategories(shopCategoriesRes.data || []); setCategories(prev => [...prev, ...(shopCategoriesRes.data || []).map((category: any) => ({ ...category, shopCategory: true }))]) }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addVariant = () => {
    setVariants(prev => [...prev, { name: '', sku: '', price: '', stock: '', image: '' }])
  }

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, field: string, value: string) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }

  const generateSku = () => {
    const prefix = form.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRD'
    const random = Math.random().toString(36).slice(2, 6).toUpperCase()
    updateField('sku', `${prefix}-${random}`)
  }

  const generateVariantSku = (index: number) => {
    const base = form.sku || 'PRD'
    const variantName = variants[index].name || 'VAR'
    const cleanVariant = variantName.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'VAR'
    const random = Math.random().toString(36).slice(2, 4).toUpperCase()
    updateVariant(index, 'sku', `${base}-${cleanVariant}-${random}`)
  }

  const parseImages = (value: string) => value.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)

  const uploadImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const files = Array.from(input.files || [])
      if (!files.length) return
      setUploading(true)
      setError('')
      try {
        const uploadedUrls: string[] = []
        for (const file of files) {
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
            uploadedUrls.push(data.data.url)
          } else {
            throw new Error(data?.error || `Image upload failed (${response.status || 'request'}). Please try again.`)
          }
        }

        const nextUrls = [...parseImages(form.images), ...uploadedUrls]
        updateField('images', nextUrls.join('\n'))
      } catch (err) {
        console.error('Upload fetch error:', err)
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    }
    input.click()
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
      const productData = {
        ...form,
        shopId,
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        stock: parseInt(form.stock) || 0,
        images: parseImages(form.images),
        isActive: !isDraft,
        status: isDraft ? 'DRAFT' : 'ACTIVE',
        draft: isDraft,
      }

      const response = await api.post<any>('/products', productData)
      if (response.success && response.data) {
        const productId = response.data.id

        // Create variants
        for (const variant of variants) {
          if (variant.name && variant.price) {
            await api.post(`/variants/products/${productId}`, {
              name: variant.name,
              sku: variant.sku || undefined,
              price: parseFloat(variant.price),
              stock: parseInt(variant.stock) || 0,
              image: variant.image || undefined,
            })
          }
        }

        router.push('/seller/onboarding')
      } else {
        setError(response.error || 'Failed to create product')
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
            <Package size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Add Product
            </h1>
            <p className="text-warm-800/60 text-sm">Create a new product for your shop</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name"
            placeholder="e.g., Gel Nails Full Set"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warm-900 mb-1.5">SKU (optional)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="SKU"
                  value={form.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={generateSku}>
                  <Hash size={16} />
                </Button>
              </div>
            </div>
            <Input
              label="Brand (optional)"
              placeholder="e.g., Nike, Apple"
              value={form.brand}
              onChange={(e) => updateField('brand', e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-medium text-warm-900">Product images</label>
              <Button type="button" variant="outline" onClick={uploadImage} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload photos'}
              </Button>
            </div>

            <textarea
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              rows={3}
              placeholder="Image URLs, one per line"
              value={form.images}
              onChange={(e) => updateField('images', e.target.value)}
            />

            {parseImages(form.images).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {parseImages(form.images).map((url, index) => (
                  <div key={`${url}-${index}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-warm-200 bg-warm-100">
                    <img src={url} alt={`Product preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => updateField('images', parseImages(form.images).filter((_, i) => i !== index).join('\n'))}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">Short Description (optional)</label>
            <textarea
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              rows={2}
              placeholder="Brief summary for product cards..."
              value={form.shortDescription}
              onChange={(e) => updateField('shortDescription', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-1.5">Description</label>
            <textarea
              className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              rows={3}
              placeholder="Describe your product..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (GH₵)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              required
            />
            <Input
              label="Original Price (optional)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.originalPrice}
              onChange={(e) => updateField('originalPrice', e.target.value)}
            />
          </div>

          <Input
            label="Stock Quantity"
            type="number"
            placeholder="0"
            value={form.stock}
            onChange={(e) => updateField('stock', e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warm-900 mb-1.5">Platform Category</label>
              <select
                className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                required
              >
                <option value="">Select category</option>
                {platformCategories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Shop Category (optional)</label>
                  <select className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4" value={form.shopCategoryId} onChange={(e) => updateField('shopCategoryId', e.target.value)}><option value="">No shop category</option>{categories.filter(category => category.shopCategory).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warm-900 mb-1.5">Platform Category</label>
              <select
                className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                required
              >
                <option value="">Select category</option>
                {platformCategories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Shop Category (optional)</label>
                  <select className="w-full bg-white border border-warm-200 rounded-xl py-3 px-4" value={form.shopCategoryId} onChange={(e) => updateField('shopCategoryId', e.target.value)}><option value="">No shop category</option>{categories.filter(category => category.shopCategory).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area"
              placeholder="e.g., Legon"
              value={form.area}
              onChange={(e) => updateField('area', e.target.value)}
            />
            <Input
              label="Condition"
              value={form.condition}
              onChange={(e) => updateField('condition', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-warm-50 rounded-xl border border-warm-200">
            <div>
              <p className="text-sm font-medium text-warm-900">Publish immediately</p>
              <p className="text-xs text-warm-800/60">Turn off to save as draft</p>
            </div>
            <button
              type="button"
              onClick={() => setIsDraft(!isDraft)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${!isDraft ? 'bg-primary' : 'bg-warm-200'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${!isDraft ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Variants */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-warm-900 text-sm">Variants (optional)</h3>
              <Button type="button" size="sm" variant="outline" onClick={addVariant} icon={<Plus size={16} />}>
                Add
              </Button>
            </div>
            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
                <Input
                  placeholder="Name (e.g., Black / L)"
                  value={variant.name}
                  onChange={(e) => updateVariant(index, 'name', e.target.value)}
                />
                <div className="flex gap-1">
                  <Input
                    placeholder="SKU"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => generateVariantSku(index)}>
                    <Hash size={14} />
                  </Button>
                </div>
                <Input
                  placeholder="Price"
                  type="number"
                  step="0.01"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, 'price', e.target.value)}
                />
                <Input
                  placeholder="Stock"
                  type="number"
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariant(index)}
                  icon={<Trash2 size={16} />}
                >
                  Remove
                </Button>
              </div>
            ))}
            {variants.length === 0 && (
              <p className="text-xs text-warm-800/60">No variants added. Simple products don&apos;t need variants.</p>
            )}
          </Card>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating Product...' : isDraft ? 'Save Draft' : 'Create Product'}
          </Button>
        </form>
      </div>
    </SellerSidebar>
  )
}
