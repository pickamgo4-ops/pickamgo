'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, DollarSign, Eye, Loader2, XCircle, X } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'
import { useRole } from '../../../contexts/RoleContext'

interface AdminPayout {
  id: string
  amount: number
  currency: string
  status: string
  reference: string
  processedAt?: string
  failureReason?: string
  payoutMethod: {
    provider: string
    phoneNumber: string
    accountName?: string
    type: string
  }
  user: { id: string; name: string; email: string }
  createdAt: string
}

export default function AdminPayoutsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [payouts, setPayouts] = useState<AdminPayout[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedPayout, setSelectedPayout] = useState<AdminPayout | null>(null)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadPayouts()
  }, [authInitialized, user, page, statusFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadPayouts(1, searchQuery, statusFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadPayouts = async (pageNum = page, search = searchQuery, status = statusFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status) params.set('status', status)

      const response = await api.get<any>(`/admin/payouts?${params.toString()}`)
      if (response.success && response.data) {
        setPayouts(response.data.payouts || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load payouts')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'default', label: 'Pending' },
      PROCESSING: { variant: 'delivery', label: 'Processing' },
      SUCCESS: { variant: 'verified', label: 'Success' },
      FAILED: { variant: 'default', label: 'Failed' },
      REVERSED: { variant: 'default', label: 'Reversed' },
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
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <DollarSign size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Payouts
            </h1>
            <p className="text-warm-800/60 text-sm">Manage payout requests</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
            <Input
              placeholder="Search by user name, email, or reference..."
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
            <option value="PROCESSING">Processing</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="REVERSED">Reversed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-warm-800/60">Loading payouts...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <XCircle size={44} className="mx-auto text-red-500 mb-3" />
            <p className="text-warm-900 font-medium">{error}</p>
            <Button onClick={() => loadPayouts()} className="mt-4">Retry</Button>
          </Card>
        ) : payouts.length === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign size={44} className="mx-auto text-warm-800/30 mb-3" />
            <p className="text-warm-800/60">No payouts found</p>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-warm-50 border-b border-warm-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">User</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Amount</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Provider</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Phone</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {payouts.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPayout(p)}
                        className="hover:bg-warm-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-warm-900">{p.user.name}</p>
                            <p className="text-xs text-warm-800/50">{p.user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-warm-900">GH₵{p.amount?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{p.payoutMethod.provider}</td>
                        <td className="px-4 py-3 text-warm-800/70 hidden md:table-cell">{p.payoutMethod.phoneNumber}</td>
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

      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedPayout(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-warm-900">Payout Details</h2>
              <button onClick={() => setSelectedPayout(null)} className="p-2 rounded-xl hover:bg-warm-100">
                <X size={20} className="text-warm-800" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">User</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedPayout.user.name}</p>
                  <p className="text-xs text-warm-800/60">{selectedPayout.user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Amount</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">GH₵{selectedPayout.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Reference</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedPayout.reference}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedPayout.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Payout Method</label>
                <div className="mt-1 p-3 bg-warm-50 rounded-xl text-sm space-y-1">
                  <p className="text-warm-900">{selectedPayout.payoutMethod.type} · {selectedPayout.payoutMethod.provider}</p>
                  <p className="text-warm-800/70">{selectedPayout.payoutMethod.phoneNumber}</p>
                  {selectedPayout.payoutMethod.accountName && (
                    <p className="text-warm-800/70">{selectedPayout.payoutMethod.accountName}</p>
                  )}
                </div>
              </div>

              {selectedPayout.failureReason && (
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Failure Reason</label>
                  <p className="text-sm text-red-600 mt-1">{selectedPayout.failureReason}</p>
                </div>
              )}

              <div className="text-xs text-warm-800/50">
                Created: {new Date(selectedPayout.createdAt).toLocaleString()}
                {selectedPayout.processedAt && (
                  <> · Processed: {new Date(selectedPayout.processedAt).toLocaleString()}</>
                )}
              </div>
            </div>
          </Card>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
