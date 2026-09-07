'use client'

import { useEffect, useState } from 'react'
import { FolderPlus, Trash2 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerCollectionsPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', description: '', productIds: [] as string[], isVisible: true, isFeatured: false })
  const load = async () => { const [collectionResponse, productResponse] = await Promise.all([api.getSellerCollections(), api.get<any>('/seller/products?limit=100')]); if (collectionResponse.success) setCollections(collectionResponse.data || []); if (productResponse.success) setProducts(productResponse.data?.products || []) }
  useEffect(() => { load() }, [])
  const create = async (event: React.FormEvent) => { event.preventDefault(); const response = await api.createSellerCollection(form); if (response.success) { setForm({ name: '', description: '', productIds: [], isVisible: true, isFeatured: false }); await load() } }
  const remove = async (id: string) => { if (window.confirm('Delete this collection?')) { await api.deleteSellerCollection(id); await load() } }
  return <SellerSidebar><div className="space-y-6"><div><h1 className="font-display text-2xl font-bold text-warm-900">Product Collections</h1><p className="text-sm text-warm-800/60">Organize products into clear sections customers can browse.</p></div><div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"><Card className="p-5"><div className="mb-4 flex items-center gap-2"><FolderPlus className="text-primary" size={20} /><h2 className="font-semibold text-warm-900">New collection</h2></div><form className="space-y-3" onSubmit={create}><Input label="Collection name" value={form.name} onValueChange={value => setForm({ ...form, name: value })} placeholder="New Arrivals" required /><label className="block text-sm font-medium text-warm-800">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 bg-transparent p-3" rows={3} /></label><label className="block text-sm font-medium text-warm-800">Products<select multiple value={form.productIds} onChange={event => setForm({ ...form, productIds: Array.from(event.target.selectedOptions, option => option.value) })} className="mt-1 h-40 w-full rounded-xl border border-warm-200 bg-transparent p-2">{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={event => setForm({ ...form, isFeatured: event.target.checked })} /> Feature this collection</label><Button type="submit">Create collection</Button></form></Card><div className="space-y-3">{collections.map(collection => <Card key={collection.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-warm-900">{collection.name}</h2><p className="text-sm text-warm-800/60">{collection.description || 'No description'} · {collection.products?.length || 0} products</p></div><Button size="sm" variant="outline" onClick={() => remove(collection.id)} icon={<Trash2 size={14} />}>Delete</Button></div></Card>)}{collections.length === 0 && <Card className="p-12 text-center text-sm text-warm-800/60">No collections yet.</Card>}</div></div></div></SellerSidebar>
}
