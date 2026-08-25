'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Plus, Edit3, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function SellerCategoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [shopId, setShopId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', image: '', sortOrder: 0, isActive: true })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const shopRes = await api.get<any>('/seller/shop')
      
      if (shopRes.success && shopRes.data?.shop) {
        setShopId(shopRes.data.shop.id)
        
        const categoriesRes = await api.get<any>('/seller/categories')
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data.categories || [])
        }
      }
    } catch {
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopId) return

    try {
      const response = await api.post(`/shop-categories/shops/${shopId}`, form)
      if (response.success) {
        setForm({ name: '', description: '', image: '', sortOrder: 0, isActive: true })
        loadData()
      } else {
        setError(response.error || 'Failed to create category')
      }
    } catch {
      setError('Failed to create category')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      const response = await api.patch(`/shop-categories/${id}`, form)
      if (response.success) {
        setEditingId(null)
        setForm({ name: '', description: '', image: '', sortOrder: 0, isActive: true })
        loadData()
      }
    } catch {
      setError('Failed to update category')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      const response = await api.delete(`/shop-categories/${id}`)
      if (response.success) {
        setCategories(prev => prev.filter(c => c.id !== id))
      }
    } catch {
      setError('Failed to delete category')
    }
  }

  const toggleVisibility = async (category: any) => {
    const response = await api.patch(`/shop-categories/${category.id}`, { isActive: !category.isActive })
    if (response.success) loadData()
    else setError(response.error || 'Failed to update category visibility')
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const newCategories = [...categories]
    const [moved] = newCategories.splice(fromIndex, 1)
    newCategories.splice(toIndex, 0, moved)
    setCategories(newCategories)

    try {
      await api.post('/shop-categories/reorder', {
        categories: newCategories.map((c, i) => ({ id: c.id, sortOrder: i })),
      })
    } catch {
      setError('Failed to reorder categories')
      loadData()
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading categories...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Categories</h1>
          <p className="text-warm-800/60 mt-1">Organize your products into categories</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {!shopId ? (
          <Card className="p-12 text-center">
            <Tag size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No shop found</h3>
            <p className="text-sm text-warm-800/60 mb-4">Create a shop first to manage categories</p>
            <Button onClick={() => router.push('/seller/shop/create')}>Create Shop</Button>
          </Card>
        ) : (
          <>
            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">
                {editingId ? 'Edit Category' : 'Create Category'}
              </h3>
              <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleSubmit} className="space-y-4">
                <Input
                  label="Category Name"
                  placeholder="e.g., Gel Nails, Burgers"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label="Description (optional)"
                  placeholder="Brief description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Input
                  label="Image URL (optional)"
                  placeholder="https://example.com/image.png"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
                <div className="flex gap-3">
                  <Button type="submit" fullWidth>
                    {editingId ? 'Update Category' : 'Create Category'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm({ name: '', description: '', image: '', sortOrder: 0, isActive: true }); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <Card className="p-8 text-center">
                  <Tag size={32} className="mx-auto text-warm-800/30 mb-2" />
                  <p className="text-sm text-warm-800/60">No categories yet</p>
                </Card>
              ) : (
                categories.map((category, index) => (
                  <Card key={category.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <GripVertical size={18} className="text-warm-800/30 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-warm-900 truncate">{category.name}</h4>
                          <Badge variant={category.isActive ? 'verified' : 'default'}>
                            {category.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-sm text-warm-800/60 mt-0.5 truncate">{category.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleVisibility(category)}
                          title={category.isActive ? 'Hide category' : 'Show category'}
                          className="p-2 rounded-lg hover:bg-warm-100 text-warm-800/60"
                        >
                          {category.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(category.id)
                            setForm({
                              name: category.name,
                              description: category.description || '',
                              image: category.image || '',
                              sortOrder: category.sortOrder || 0,
                              isActive: category.isActive,
                            })
                          }}
                          className="p-2 rounded-lg hover:bg-warm-100 text-warm-800/60"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </SellerSidebar>
  )
}
