'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Truck, Eye, Loader2, XCircle, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminDelivery {
  id: string
  status: string
  distance?: string
  fee: number
  riderEarnings: number
  acceptedAt?: string
  pickedUpAt?: string
  deliveredAt?: string
  createdAt: string
  order: {
    id: string
    orderNumber: string
    total: number
    status: string
    customer: { name: string; email: string }
    shop: { name: string }
  }
  rider: { name: string; email: string; phone?: string }
}

export default function AdminDeliveriesPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedDelivery, setSelectedDelivery] = useState<AdminDelivery | null>(null)
  const loadingRef = useRef(false)

  const loadDeliveries = useCallback(async (pageNum: number, search: string, status: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status) params.set('status', status)

      const response = await api.get<any>(`/admin/deliveries?${params.toString()}`)
      if (response.success && response.data) {
        setDeliveries(response.data.deliveries || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load deliveries')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadDeliveries(page, searchQuery, statusFilter)
  }, [authInitialized, user, page, searchQuery, statusFilter, loadDeliveries, router])

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'default', label: 'Pending' },
      ACCEPTED: { variant: 'deal', label: 'Accepted' },
      PICKED_UP: { variant: 'delivery', label: 'Picked Up' },
      DELIVERED: { variant: 'verified', label: 'Delivered' },
      CANCELLED: { variant: 'default', label: 'Cancelled' },
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Truck size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Deliveries
          </h1>
          <p className="text-warm-800/60 text-sm">Track and manage deliveries</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search by order number or customer..."
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
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading deliveries...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadDeliveries(page, searchQuery, statusFilter)} className="mt-4">Retry</Button>
        </Card>
      ) : deliveries.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No deliveries found</p>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Order</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Rider</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Fee</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {deliveries.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDelivery(d)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-warm-900">#{d.order.orderNumber}</p>
                          <p className="text-xs text-warm-800/50">{d.order.customer?.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-warm-800/70">
                        {d.rider?.name || '-'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                      <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">
                        GH₵{Number(d.fee).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                        {new Date(d.createdAt).toLocaleDateString()}
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

      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedDelivery(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">Delivery Details</h2>
                <button onClick={() => setSelectedDelivery(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Order</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">
                      #{selectedDelivery.order.orderNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedDelivery.status)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Rider</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">
                      {selectedDelivery.rider?.name || 'Unassigned'}
                    </p>
                    <p className="text-xs text-warm-800/60">
                      {selectedDelivery.rider?.phone || ''}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Fee</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">
                      GH₵{Number(selectedDelivery.fee).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Customer</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">
                    {selectedDelivery.order.customer?.name}
                  </p>
                  <p className="text-xs text-warm-800/60">
                    {selectedDelivery.order.customer?.email}
                  </p>
                </div>
                <div className="text-xs text-warm-800/50">
                  Created: {new Date(selectedDelivery.createdAt).toLocaleString()}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
