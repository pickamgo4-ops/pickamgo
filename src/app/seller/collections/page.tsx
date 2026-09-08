'use client'

import { useEffect, useState } from 'react'
import { FolderPlus, Trash2, Loader2 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerCollectionsPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', productIds: [] as string[], isVisible: true, isFeatured: false })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [collectionResponse, productResponse] = await Promise.all([
        api.getSellerCollections(),
        api.get<any>('/seller/products?limit=100'),
      ])
      if (collectionResponse.success) {
        setCollections(collectionResponse.data || [])
      } else {
        setError(collectionResponse.error || 'Failed to load collections')
      }
      if (productResponse.success) {
        setProducts(productResponse.data?.products || [])
      }
    } catch {
      setError('Failed to load collections. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await api.createSellerCollection(form)
      if (response.success) {
        setForm({ name: '', description: '', productIds: [], isVisible: true, isFeatured: false })
        await load()
      } else {
        setError(response.error || 'Failed to create collection')
      }
    } catch {
      setError('Failed to create collection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this collection?')) return
    setError(null)
    try {
      const response = await api.deleteSellerCollection(id)
      if (response.success) {
        await load()
      } else {
        setError(response.error || 'Failed to delete collection')
      }
    } catch {
      setError('Failed to delete collection. Please try again.')
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={36} />
            <p className="text-warm-800/60">Loading collections...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-warm-900">Product Collections</h1>
          <p className="text-sm text-warm-800/60">Organize products into clear sections customers can browse.</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>Retry</Button>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderPlus className="text-primary" size={20} />
              <h2 className="font-semibold text-warm-900">New collection</h2>
            </div>
            <form className="space-y-3" onSubmit={create}>
              <Input
                label="Collection name"
                value={form.name}
                onValueChange={value => setForm({ ...form, name: value })}
                placeholder="New Arrivals"
                required
              />
              <label className="block text-sm font-medium text-warm-800">
                Description
                <textarea
                  value={form.description}
                  onChange={event => setForm({ ...form, description: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-warm-200 bg-transparent p-3"
                  rows={3}
                />
              </label>
              <label className="block text-sm font-medium text-warm-800">
                Products
                <select
                  multiple
                  value={form.productIds}
                  onChange={event => setForm({ ...form, productIds: Array.from(event.target.selectedOptions, option => option.value) })}
                  className="mt-1 h-40 w-full rounded-xl border border-warm-200 bg-transparent p-2"
                >
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={event => setForm({ ...form, isFeatured: event.target.checked })}
                />
                Feature this collection
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create collection'}
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            {collections.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderPlus size={42} className="mx-auto text-warm-800/25 mb-3" />
                <h2 className="font-semibold text-warm-900">No collections yet</h2>
                <p className="text-sm text-warm-800/60 mt-1">Create your first collection to organize products.</p>
              </Card>
            ) : (
              collections.map(collection => (
                <Card key={collection.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-warm-900">{collection.name}</h2>
                      <p className="text-sm text-warm-800/60">{collection.description || 'No description'} · {collection.products?.length || 0} products</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove(collection.id)} icon={<Trash2 size={16} />} aria-label="Delete collection">
                      Delete
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </SellerSidebar>
  )
}
