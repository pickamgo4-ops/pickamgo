'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Package, Eye, Loader2, XCircle, X, Trash2, CheckCircle, Ban } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'
import { useRole } from '../../../contexts/RoleContext'

interface AdminProduct {
  id: string
  name: string
  image: string
  shop: { id: string; name: string }
  category: string
  price: number
  stock: number
  status: string
  createdAt: string
}

interface ProductDetail {
  id: string
  name: string
  description: string
  image: string
  images?: string[]
  price: number
  stock: number
  status: string
  category: string
  shop: { id: string; name: string; slug: string }
  createdAt: string
}

export default function AdminProductsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [productLoading, setProductLoading] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadProducts()
    loadCategories()
  }, [authInitialized, user, page, statusFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadProducts(1, searchQuery, statusFilter, categoryFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadCategories = async () => {
    try {
      const response = await api.get<any[]>('/categories')
      if (response.success && Array.isArray(response.data)) {
        setCategories(response.data.map(c => c.name || c.id).filter(Boolean))
      }
    } catch {
      // ignore
    }
  }

  const loadProducts = async (pageNum = page, search = searchQuery, status = statusFilter, category = categoryFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (category) params.set('category', category)

      const response = await api.get<any>(`/admin/products?${params.toString()}`)
      if (response.success && response.data) {
        setProducts(response.data.products || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load products')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const loadProductDetail = async (productId: string) => {
    setProductLoading(true)
    try {
      const response = await api.get<any>(`/admin/products/${productId}`)
      if (response.success && response.data) {
        setSelectedProduct(response.data)
      }
    } catch {
      console.error('Failed to load product detail')
    } finally {
      setProductLoading(false)
    }
  }

  const handleProductClick = (p: AdminProduct) => {
    loadProductDetail(p.id)
  }

  const updateProductStatus = async (productId: string, status: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const action = status === 'ACTIVE' ? 'publish' : status === 'DRAFT' ? 'unpublish' : status.toLowerCase()
    if (!window.confirm(`Are you sure you want to ${action} "${product.name}"?`)) return

    const response = await api.patch(`/admin/products/${productId}`, { status })
    if (response.success) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status } : p))
      if (selectedProduct?.id === productId) {
        setSelectedProduct(prev => prev ? { ...prev, status } : null)
      }
    }
  }

  const deleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    if (!window.confirm(`Are you sure you want to DELETE "${product.name}"? This cannot be undone.`)) return

    const response = await api.delete(`/admin/products/${productId}`)
    if (response.success) {
      setProducts(prev => prev.filter(p => p.id !== productId))
      setSelectedProduct(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'verified', label: 'Active' },
      DRAFT: { variant: 'default', label: 'Draft' },
      ARCHIVED: { variant: 'default', label: 'Archived' },
      HIDDEN: { variant: 'default', label: 'Hidden' },
    }
    const c = config[status] || { variant: 'default', label: status }
    return <Badge variant={c.variant}>{c.label}</Badge>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Products
            </h1>
            <p className="text-warm-800/60 text-sm">Manage products across all shops</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
            <Input
              placeholder="Search by product or shop name..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-warm-800/60">Loading products...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <XCircle size={44} className="mx-auto text-red-500 mb-3" />
            <p className="text-warm-900 font-medium">{error}</p>
            <Button onClick={() => loadProducts()} className="mt-4">Retry</Button>
          </Card>
        ) : products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package size={44} className="mx-auto text-warm-800/30 mb-3" />
            <p className="text-warm-800/60">No products found</p>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-warm-50 border-b border-warm-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Product</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Shop</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Price</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Stock</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => handleProductClick(p)}
                        className="hover:bg-warm-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image || '/placeholder.png'}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover bg-warm-200 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-warm-900 truncate">{p.name}</p>
                              <p className="text-xs text-warm-800/50 truncate">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-warm-800/70 hidden md:table-cell">{p.shop?.name}</td>
                        <td className="px-4 py-3 font-medium text-warm-900">GH₵{p.price?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{p.stock}</td>
                        <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                        <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedProduct(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-warm-900">Product Details</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-2 rounded-xl hover:bg-warm-100">
                <X size={20} className="text-warm-800" />
              </button>
            </div>

            {productLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : selectedProduct ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-16 h-16 rounded-xl object-cover bg-warm-200"
                  />
                  <div>
                    <p className="font-medium text-warm-900">{selectedProduct.name}</p>
                    <p className="text-sm text-warm-800/60">{selectedProduct.shop.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Category</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Price</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">GH₵{selectedProduct.price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Stock</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedProduct.stock}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedProduct.status)}</div>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Description</label>
                    <p className="text-sm text-warm-800/80 mt-1">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-warm-800/50 uppercase">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.status !== 'ACTIVE' && (
                      <Button size="sm" onClick={() => updateProductStatus(selectedProduct.id, 'ACTIVE')}>
                        <CheckCircle size={16} />
                        Publish
                      </Button>
                    )}
                    {selectedProduct.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => updateProductStatus(selectedProduct.id, 'ARCHIVED')}>
                        <Ban size={16} />
                        Unpublish
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteProduct(selectedProduct.id)}>
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
