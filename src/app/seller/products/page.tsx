'use client'

import React, { useEffect, useState } from 'react'
import { Edit3, Eye, EyeOff, Package, Plus, Search, Trash2 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState('newest')
  const [stockEditing, setStockEditing] = useState<string | null>(null)
  const [stock, setStock] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const shop = await api.get<any>('/seller/shop')
    const shopId = shop.data?.shop?.id
    if (!shopId) return
    const [productResponse, categoryResponse] = await Promise.all([
      api.get<any>(`/seller/products?search=${encodeURIComponent(search)}&status=${status}&categoryId=${categoryId}&sort=${sort}`),
      api.get<any>(`/shop-categories/shops/${shopId}`),
    ])
    if (productResponse.success) setProducts(productResponse.data?.products || [])
    if (categoryResponse.success) setCategories(categoryResponse.data || [])
  }

  useEffect(() => { load() }, [search, status, categoryId, sort])

  const toggleVisibility = async (product: any) => {
    const next = product.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE'
    const response = await api.patch(`/seller/products/${product.id}/visibility`, { status: next })
    if (response.success) load(); else setError(response.error || 'Could not update visibility')
  }

  const updateStock = async (id: string) => {
    const response = await api.patch(`/seller/products/${id}/stock`, { stock: Number(stock) })
    if (response.success) { setStockEditing(null); load() } else setError(response.error || 'Could not update stock')
  }

  const archive = async (id: string) => {
    if (!window.confirm('Delete this product? Purchased products will be archived to preserve order history.')) return
    const response = await api.delete(`/products/${id}`)
    if (response.success) load(); else setError(response.error || 'Could not delete product')
  }

  return <SellerSidebar><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl font-bold text-warm-900">Products</h1><p className="text-warm-800/60 mt-1">Manage your catalog without changing orders.</p></div><Button onClick={() => window.location.href = '/seller/products/new'} icon={<Plus size={18} />}>Add Product</Button></div>
    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" /><Input className="pl-9" placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} /></div><select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-warm-200 px-3 bg-white text-sm"><option value="">All statuses</option><option value="ACTIVE">Visible</option><option value="HIDDEN">Hidden</option><option value="OUT_OF_STOCK">Out of stock</option><option value="ARCHIVED">Archived</option></select><select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="rounded-xl border border-warm-200 px-3 bg-white text-sm"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={sort} onChange={e => setSort(e.target.value)} className="rounded-xl border border-warm-200 px-3 bg-white text-sm"><option value="newest">Newest</option><option value="name">Name</option><option value="price">Price</option><option value="stock">Stock</option></select></div>
    {products.length === 0 ? <Card className="p-12 text-center"><Package size={44} className="mx-auto text-warm-800/30 mb-3" /><p className="text-warm-800/60">No products match these filters.</p></Card> : <div className="space-y-3">{products.map(product => <Card key={product.id} className="p-4"><div className="flex items-start gap-3 sm:gap-4"><div className="w-16 h-16 rounded-xl overflow-hidden bg-warm-100 flex-shrink-0"><img src={product.images?.[0]?.url || ''} alt={product.name} className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-warm-900 truncate">{product.name}</h2><Badge variant={product.status === 'ACTIVE' ? 'verified' : product.status === 'HIDDEN' ? 'default' : 'deal'}>{product.status}</Badge></div><p className="text-sm text-warm-800/60 mt-1">{product.shopCategory?.name || product.category?.name || 'Uncategorized'}</p><div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm"><span className="font-bold text-warm-900">GH₵{Number(product.price).toFixed(2)}</span><span className="text-warm-800/60">Stock: {product.stock}</span><span className="text-warm-800/50">Added {new Date(product.createdAt).toLocaleDateString()}</span></div></div><div className="flex items-center gap-1"><button aria-label="Edit product" title="Edit product" onClick={() => window.location.href = `/seller/products/${product.id}/edit`} className="p-2 rounded-lg hover:bg-warm-100"><Edit3 size={17} /></button><button aria-label={product.status === 'ACTIVE' ? 'Hide product' : 'Show product'} title={product.status === 'ACTIVE' ? 'Hide product' : 'Show product'} onClick={() => toggleVisibility(product)} className="p-2 rounded-lg hover:bg-warm-100">{product.status === 'ACTIVE' ? <EyeOff size={17} /> : <Eye size={17} />}</button><button aria-label="Manage stock" title="Manage stock" onClick={() => { setStockEditing(product.id); setStock(String(product.stock)) }} className="p-2 rounded-lg hover:bg-warm-100 text-primary">#</button><button aria-label="Archive product" title="Archive product" onClick={() => archive(product.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={17} /></button></div></div>{stockEditing === product.id && <div className="mt-3 flex gap-2"><Input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /><Button size="sm" onClick={() => updateStock(product.id)}>Save stock</Button><Button size="sm" variant="ghost" onClick={() => setStockEditing(null)}>Cancel</Button></div>}</Card>)}</div>}
  </div></SellerSidebar>
}
