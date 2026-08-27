'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Tag, Plus, Edit2, Trash2, Loader2, X, Save, XCircle } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'
import { useRole } from '../../../contexts/RoleContext'

interface AdminCategory {
  id: string
  name: string
  icon: string
  color: string
  productsCount: number
  servicesCount: number
  isActive: boolean
  createdAt: string
  parent?: { id: string; name: string }
}

interface CategoryFormData {
  name: string
  icon: string
  color: string
  parentId: string
  isActive: boolean
}

const initialForm: CategoryFormData = {
  name: '',
  icon: '',
  color: '#FF6B35',
  parentId: '',
  isActive: true,
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<CategoryFormData>(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadCategories()
  }, [authInitialized, user])

  const loadCategories = async () => {
    setDataLoading(true)
    setError('')
    try {
      const response = await api.get<any>('/admin/categories')
      if (response.success && response.data) {
        setCategories(response.data.categories || [])
      } else {
        setError(response.error || 'Failed to load categories')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setForm(initialForm)
  }

  const handleEdit = (cat: AdminCategory) => {
    setEditingId(cat.id)
    setIsCreating(false)
    setForm({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      parentId: cat.parent?.id || '',
      isActive: cat.isActive,
    })
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload: any = {
        name: form.name,
        icon: form.icon,
        color: form.color,
        isActive: form.isActive,
      }
      if (form.parentId) payload.parentId = form.parentId

      let response
      if (editingId) {
        response = await api.patch(`/admin/categories/${editingId}`, payload)
      } else {
        response = await api.post('/admin/categories', payload)
      }

      if (response.success) {
        setEditingId(null)
        setIsCreating(false)
        setForm(initialForm)
        loadCategories()
      }
    } catch {
      console.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: AdminCategory) => {
    if (cat.productsCount > 0) {
      alert('Cannot delete this category because it has products associated with it.')
      return
    }
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"?`)) return

    const response = await api.delete(`/admin/categories/${cat.id}`)
    if (response.success) {
      setCategories(prev => prev.filter(c => c.id !== cat.id))
    }
  }

  if (loading || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Tag size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                Categories
              </h1>
              <p className="text-warm-800/60 text-sm">Manage platform categories</p>
            </div>
          </div>
          {!isCreating && !editingId && (
            <Button onClick={handleCreate} icon={<Plus size={18} />}>
              Add Category
            </Button>
          )}
        </div>

        {(isCreating || editingId) && (
          <Card className="p-6 mb-6">
            <h3 className="font-semibold text-warm-900 mb-4">
              {editingId ? 'Edit Category' : 'New Category'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-warm-900 mb-1.5 block">Name</label>
                <Input
                  placeholder="Category name"
                  value={form.name}
                  onValueChange={(v) => setForm(prev => ({ ...prev, name: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-warm-900 mb-1.5 block">Icon</label>
                  <Input
                    placeholder="e.g. Tag"
                    value={form.icon}
                    onValueChange={(v) => setForm(prev => ({ ...prev, icon: v }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-warm-900 mb-1.5 block">Color</label>
                  <Input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                    className="h-12 p-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-warm-900 mb-1.5 block">Parent Category ID (optional)</label>
                <Input
                  placeholder="Leave empty for top-level"
                  value={form.parentId}
                  onValueChange={(v) => setForm(prev => ({ ...prev, parentId: v }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-warm-200"
                />
                <label htmlFor="isActive" className="text-sm text-warm-900">Active</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || !form.name.trim()} icon={<Save size={16} />}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setIsCreating(false); setForm(initialForm) }}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-warm-800/60">Loading categories...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <XCircle size={44} className="mx-auto text-red-500 mb-3" />
            <p className="text-warm-900 font-medium">{error}</p>
            <Button onClick={loadCategories} className="mt-4">Retry</Button>
          </Card>
        ) : categories.length === 0 ? (
          <Card className="p-12 text-center">
            <Tag size={44} className="mx-auto text-warm-800/30 mb-3" />
            <p className="text-warm-800/60">No categories found</p>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Name</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Icon</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Color</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Products</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Services</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Active</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-warm-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-warm-900">{cat.name}</td>
                      <td className="px-4 py-3 text-warm-800/70">{cat.icon || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-warm-200" style={{ backgroundColor: cat.color }} />
                          <span className="text-warm-800/70 text-xs">{cat.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-warm-800/70">{cat.productsCount}</td>
                      <td className="px-4 py-3 text-warm-800/70">{cat.servicesCount}</td>
                      <td className="px-4 py-3">
                        {cat.isActive ? (
                          <Badge variant="verified">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="p-2 rounded-xl hover:bg-warm-100 text-warm-800"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
