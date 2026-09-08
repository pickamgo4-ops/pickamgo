'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

const statuses = ['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED']

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

function statusVariant(status: string): any {
  if (status === 'RESOLVED') return 'verified'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'deal'
  return 'default'
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [disputes, setDisputes] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initialStatus = new URLSearchParams(window.location.search).get('status')
    if (initialStatus && statuses.includes(initialStatus)) setStatus(initialStatus)
  }, [])

  const loadDisputes = useCallback(async () => {
    if (!authInitialized || !user?.isAdmin) return
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort })
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status', status)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const response = await api.get<any>(`/disputes?${params.toString()}`)
      if (!response.success || !response.data) {
        setError(response.error || 'Failed to fetch disputes')
        return
      }
      setDisputes(response.data.disputes || [])
      setTotal(response.data.pagination?.total || 0)
      setTotalPages(response.data.pagination?.totalPages || 1)
    } catch {
      setError('Failed to fetch disputes. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }, [authInitialized, user, page, search, status, dateFrom, dateTo, sort])

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadDisputes()
  }, [authInitialized, user, loadDisputes, router])

  useEffect(() => setPage(1), [search, status, dateFrom, dateTo, sort])

  if (loading || !authInitialized) return <div className="py-20 text-center text-warm-800/60">Loading disputes...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><AlertTriangle size={21} className="text-red-600" /></div>
          <div><h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Disputes</h1><p className="text-sm text-warm-800/60">Review customer and seller order disputes</p></div>
        </div>
        <Button variant="outline" size="sm" onClick={loadDisputes} icon={<RefreshCw size={16} />}>Refresh</Button>
      </div>

      {error && <Card className="p-4 border-red-200 bg-red-50"><div className="flex items-center justify-between gap-3"><p className="text-sm text-red-700">{error}</p><Button variant="outline" size="sm" onClick={loadDisputes}>Retry</Button></div></Card>}

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/40" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Dispute ID, order, customer, seller" className="w-full rounded-xl border border-warm-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
          <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option>{statuses.slice(1).map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select>
          <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm" />
          <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm" />
        </div>
        <div className="flex items-center justify-between gap-3 mt-3"><p className="text-xs text-warm-800/60">{total} dispute{total === 1 ? '' : 's'}</p><select value={sort} onChange={event => setSort(event.target.value)} className="rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-xs"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
      </Card>

      {dataLoading ? <div className="py-16 text-center text-warm-800/60">Loading disputes...</div> : disputes.length === 0 ? <Card className="p-12 text-center"><AlertTriangle size={42} className="mx-auto text-warm-800/25 mb-3" /><h2 className="font-semibold text-warm-900">No disputes found</h2><p className="text-sm text-warm-800/60 mt-1">Existing disputes matching this view will appear here.</p></Card> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-warm-50 border-b border-warm-200"><tr className="text-left text-xs uppercase text-warm-800/60"><th className="px-4 py-3">Dispute</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer / Seller</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-warm-200">{disputes.map(dispute => <tr key={dispute.id} className="hover:bg-warm-50"><td className="px-4 py-4 font-mono text-xs text-warm-800">{dispute.id}</td><td className="px-4 py-4"><p className="font-medium text-warm-900">#{dispute.order?.orderNumber || dispute.orderId}</p><p className="text-xs text-warm-800/60">{dispute.order?.shop?.name || 'Shop unavailable'}</p></td><td className="px-4 py-4"><p className="text-warm-900">{dispute.customer?.name || 'Customer unavailable'}</p><p className="text-xs text-warm-800/60">{dispute.seller?.name || 'Seller unavailable'}</p></td><td className="px-4 py-4 max-w-xs"><p className="font-medium text-warm-900">{dispute.type.replace(/_/g, ' ')}</p><p className="truncate text-xs text-warm-800/60">{dispute.description}</p></td><td className="px-4 py-4">GH₵{Number(dispute.amount ?? dispute.order?.total ?? 0).toFixed(2)}</td><td className="px-4 py-4"><Badge variant={statusVariant(dispute.status)}>{statusLabel(dispute.status)}</Badge></td><td className="px-4 py-4 whitespace-nowrap text-xs text-warm-800/60">{new Date(dispute.createdAt).toLocaleDateString()}</td><td className="px-4 py-4"><Button variant="ghost" size="sm" onClick={() => router.push(`/admin/disputes/${dispute.id}`)} icon={<Eye size={16} />} aria-label="View dispute">View</Button></td></tr>)}</tbody></table></div>
        </Card>
      )}

      {totalPages > 1 && <div className="flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(current => current - 1)} icon={<ChevronLeft size={16} />}>Previous</Button><span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} icon={<ChevronRight size={16} />}>Next</Button></div>}
    </div>
  )
}
