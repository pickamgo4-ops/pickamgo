'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, FileText, Eye, Loader2, XCircle, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminOrder {
  id: string
  orderNumber: string
  customerName: string
  customerEmail?: string
  isGuest: boolean
  shopName: string
  total: number
  paymentStatus: string
  status: string
  riderName?: string
  createdAt: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  total: number
  subtotal: number
  deliveryFee: number
  paymentStatus: string
  paymentMethod: string
  fulfillmentMethod: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  isGuest: boolean
  shopName: string
  riderName?: string
  deliveryAddress: string
  deliveryInstructions?: string
  latitude?: number
  longitude?: number
  items: any[]
  timeline: any[]
  createdAt: string
}

const PAYMENT_STATUSES = ['PENDING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED']
const ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED']

export default function AdminOrdersPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadOrders()
  }, [authInitialized, user, page, statusFilter, paymentFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadOrders(1, searchQuery, statusFilter, paymentFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadOrders = async (pageNum = page, search = searchQuery, status = statusFilter, payment = paymentFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (payment) params.set('paymentStatus', payment)

      const response = await api.get<any>(`/admin/orders?${params.toString()}`)
      if (response.success && response.data) {
        setOrders(response.data.orders || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load orders')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const loadOrderDetail = async (orderId: string) => {
    setOrderLoading(true)
    try {
      const response = await api.get<any>(`/admin/orders/${orderId}`)
      if (response.success && response.data) {
        setSelectedOrder(response.data)
      }
    } catch {
      console.error('Failed to load order detail')
    } finally {
      setOrderLoading(false)
    }
  }

  const handleOrderClick = (o: AdminOrder) => {
    loadOrderDetail(o.id)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    if (!window.confirm(`Update order #${order.orderNumber} status to ${newStatus}?`)) return

    setUpdatingStatus(true)
    try {
      const response = await api.patch(`/admin/orders/${orderId}`, { status: newStatus })
      if (response.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
        }
      }
    } catch {
      console.error('Failed to update order status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getPaymentBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      PENDING_PAYMENT: { variant: 'default', label: 'Pending' },
      PAID: { variant: 'verified', label: 'Paid' },
      CONFIRMED: { variant: 'deal', label: 'Confirmed' },
      PREPARING: { variant: 'delivery', label: 'Preparing' },
      READY_FOR_PICKUP: { variant: 'new', label: 'Ready' },
      OUT_FOR_DELIVERY: { variant: 'delivery', label: 'Out for Delivery' },
      DELIVERED: { variant: 'verified', label: 'Delivered' },
      CANCELLED: { variant: 'default', label: 'Cancelled' },
      FAILED: { variant: 'default', label: 'Failed' },
    }
    const c = config[status] || { variant: 'default', label: status }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  if (loading || !authInitialized) {
    return (
      <div className="flex items-center justify-center py-20">
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
          <FileText size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Orders
          </h1>
          <p className="text-warm-800/60 text-sm">Manage platform orders</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search by order number, customer, or shop..."
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
          <option value="">All order statuses</option>
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading orders...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadOrders()} className="mt-4">Retry</Button>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No orders found</p>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Order</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Customer</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Total</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Rider</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => handleOrderClick(o)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-warm-900">#{o.orderNumber}</p>
                          <p className="text-xs text-warm-800/50">{o.shopName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-warm-800/70">{o.customerName}</span>
                          {o.isGuest && <Badge variant="default" size="sm">Guest</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-warm-900 hidden sm:table-cell">GH₵{o.total?.toFixed(2)}</td>
                      <td className="px-4 py-3">{getPaymentBadge(o.status)}</td>
                      <td className="px-4 py-3 text-warm-800/70 hidden lg:table-cell">{o.riderName || '-'}</td>
                      <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                        {new Date(o.createdAt).toLocaleDateString()}
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

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedOrder(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">Order #{selectedOrder.orderNumber}</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>

              {orderLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : selectedOrder ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {getPaymentBadge(selectedOrder.status)}
                    <Badge variant={selectedOrder.isGuest ? 'default' : 'verified'}>
                      {selectedOrder.isGuest ? 'Guest' : 'Registered'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Customer</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedOrder.customerName}</p>
                      <p className="text-xs text-warm-800/60">{selectedOrder.customerEmail || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Shop</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedOrder.shopName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Total</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">GH₵{selectedOrder.total?.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Payment</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedOrder.paymentMethod}</p>
                    </div>
                  </div>

                  {selectedOrder.deliveryAddress && (
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Delivery Address</label>
                      <p className="text-sm text-warm-900 mt-1">{selectedOrder.deliveryAddress}</p>
                    </div>
                  )}

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase mb-2 block">Items</label>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 bg-warm-50 rounded-xl text-sm flex justify-between">
                            <span className="text-warm-900">{item.product?.name || item.service?.name || 'Item'} x{item.quantity}</span>
                            <span className="font-medium text-warm-900">GH₵{item.price?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-warm-800/50 uppercase">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {ORDER_STATUSES.filter(s => s !== 'CANCELLED' && s !== 'FAILED').map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={selectedOrder.status === status ? 'primary' : 'outline'}
                          onClick={() => updateOrderStatus(selectedOrder.id, status)}
                          disabled={updatingStatus || selectedOrder.status === status}
                        >
                          {status.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
