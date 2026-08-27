'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Store, ExternalLink, CheckCircle, XCircle, Loader2, Package, ShoppingBag, X } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'
import { useRole } from '../../../contexts/RoleContext'

interface AdminShop {
  id: string
  name: string
  slug: string
  status: string
  isVerified: boolean
  productsCount: number
  ordersCount: number
  createdAt: string
  owner: { id: string; name: string; email: string }
}

interface ShopDetail {
  id: string
  name: string
  slug: string
  status: string
  isVerified: boolean
  description: string
  productsCount: number
  ordersCount: number
  createdAt: string
  owner: { id: string; name: string; email: string; phone?: string }
  publicUrl: string
  products?: any[]
  recentOrders?: any[]
}

export default function AdminShopsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [shops, setShops] = useState<AdminShop[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedShop, setSelectedShop] = useState<ShopDetail | null>(null)
  const [shopLoading, setShopLoading] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadShops()
  }, [authInitialized, user, page, statusFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadShops(1, searchQuery, statusFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadShops = async (pageNum = page, search = searchQuery, status = statusFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status) params.set('status', status)

      const response = await api.get<any>(`/admin/shops?${params.toString()}`)
      if (response.success && response.data) {
        setShops(response.data.shops || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load shops')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const loadShopDetail = async (shopId: string) => {
    setShopLoading(true)
    try {
      const response = await api.get<any>(`/admin/shops/${shopId}`)
      if (response.success && response.data) {
        setSelectedShop(response.data)
      }
    } catch {
      console.error('Failed to load shop detail')
    } finally {
      setShopLoading(false)
    }
  }

  const handleShopClick = (s: AdminShop) => {
    loadShopDetail(s.id)
  }

  const updateShopStatus = async (shopId: string, status: string) => {
    const shop = shops.find(s => s.id === shopId)
    if (!shop) return
    const action = status === 'ACTIVE' ? 'activate' : status === 'SUSPENDED' ? 'suspend' : status.toLowerCase()
    if (!window.confirm(`Are you sure you want to ${action} "${shop.name}"?`)) return

    const response = await api.patch(`/admin/shops/${shopId}`, { status })
    if (response.success) {
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, status } : s))
      if (selectedShop?.id === shopId) {
        setSelectedShop(prev => prev ? { ...prev, status } : null)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'verified', label: 'Active' },
      SUSPENDED: { variant: 'default', label: 'Suspended' },
      PENDING: { variant: 'delivery', label: 'Pending' },
      REJECTED: { variant: 'default', label: 'Rejected' },
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
            <Store size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Shops
            </h1>
            <p className="text-warm-800/60 text-sm">Manage shops and approvals</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
            <Input
              placeholder="Search by name, slug, or owner email..."
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
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-warm-800/60">Loading shops...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <XCircle size={44} className="mx-auto text-red-500 mb-3" />
            <p className="text-warm-900 font-medium">{error}</p>
            <Button onClick={() => loadShops()} className="mt-4">Retry</Button>
          </Card>
        ) : shops.length === 0 ? (
          <Card className="p-12 text-center">
            <Store size={44} className="mx-auto text-warm-800/30 mb-3" />
            <p className="text-warm-800/60">No shops found</p>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-warm-50 border-b border-warm-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Shop</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Owner</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Products</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Orders</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {shops.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => handleShopClick(s)}
                        className="hover:bg-warm-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-warm-900">{s.name}</p>
                              <p className="text-xs text-warm-800/50">{s.slug}</p>
                            </div>
                            {s.isVerified && <CheckCircle size={14} className="text-green-600 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-warm-800/70 hidden md:table-cell">{s.owner?.email}</td>
                        <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                        <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{s.productsCount}</td>
                        <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{s.ordersCount}</td>
                        <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                          {new Date(s.createdAt).toLocaleDateString()}
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

      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedShop(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-warm-900">Shop Details</h2>
              <button onClick={() => setSelectedShop(null)} className="p-2 rounded-xl hover:bg-warm-100">
                <X size={20} className="text-warm-800" />
              </button>
            </div>

            {shopLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : selectedShop ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Name</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedShop.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Slug</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedShop.slug}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Owner</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedShop.owner?.name}</p>
                    <p className="text-xs text-warm-800/60">{selectedShop.owner?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedShop.status)}</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Public URL</label>
                  <a
                    href={selectedShop.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    {selectedShop.publicUrl}
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1 text-warm-800/70">
                    <Package size={16} />
                    {selectedShop.productsCount} products
                  </div>
                  <div className="flex items-center gap-1 text-warm-800/70">
                    <ShoppingBag size={16} />
                    {selectedShop.ordersCount} orders
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-warm-800/50 uppercase">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedShop.status !== 'ACTIVE' && (
                      <Button size="sm" onClick={() => updateShopStatus(selectedShop.id, 'ACTIVE')}>
                        <CheckCircle size={16} />
                        Approve / Activate
                      </Button>
                    )}
                    {selectedShop.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => updateShopStatus(selectedShop.id, 'SUSPENDED')}>
                        <XCircle size={16} />
                        Suspend
                      </Button>
                    )}
                    {selectedShop.status === 'SUSPENDED' && (
                      <Button size="sm" onClick={() => updateShopStatus(selectedShop.id, 'ACTIVE')}>
                        <CheckCircle size={16} />
                        Reactivate
                      </Button>
                    )}
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
