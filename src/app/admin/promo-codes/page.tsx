'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, Plus, Search, Filter, TrendingUp, DollarSign, ShoppingCart, Percent, MoreVertical, Pause, Play, Trash2, Eye, X } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { PromoCode, PlatformPromoStats } from '@/types'
import { useRole } from '@/contexts/RoleContext'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  EXPIRED: 'bg-red-100 text-red-700',
  EXHAUSTED: 'bg-orange-100 text-orange-700',
}

const fundingColors: Record<string, string> = {
  SELLER: 'bg-blue-100 text-blue-700',
  PICKAMGO: 'bg-purple-100 text-purple-700',
}

export default function AdminPromoCodesPage() {
  const router = useRouter()
  const { user } = useRole()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [stats, setStats] = useState<PlatformPromoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fundingFilter, setFundingFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [search, statusFilter, fundingFilter, page])

  const loadData = async () => {
    setLoading(true)
    try {
      const [promosRes, statsRes] = await Promise.all([
        api.getAdminPromos({ page, limit: 20, search: search || undefined, status: statusFilter || undefined, fundingType: fundingFilter || undefined }),
        api.getPlatformPromoStats(),
      ])
      if (promosRes.success && promosRes.data) {
        setPromos(promosRes.data.promos)
        setTotalPages(promosRes.data.pagination.totalPages)
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
    } catch (err) {
      console.error('Failed to load promos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return
    const res = await api.deleteAdminPromo(id)
    if (res.success) {
      loadData()
    }
  }

  const handleToggleStatus = async (promo: PromoCode) => {
    const newStatus = promo.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const res = await api.updateAdminPromo(promo.id, { status: newStatus })
    if (res.success) {
      loadData()
    }
  }

  const formatCurrency = (amount: number) => `GH₵${amount.toFixed(2)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 min-w-0 max-w-full overflow-x-hidden pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto min-w-0 p-4 md:p-6 lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-[-0.04em] text-warm-900 leading-none">Promo Codes</h1>
              <p className="text-warm-800/60 text-base mt-3">Manage and track all promotional campaigns</p>
            </div>
            <Button
              onClick={() => router.push('/admin/promo-codes/new')}
              className="!rounded-2xl !px-6 !py-4 text-lg shadow-[0_12px_25px_rgba(249,115,22,0.22)] hover:shadow-[0_16px_30px_rgba(249,115,22,0.28)]"
              icon={<Plus size={20} />}
            >
              Create Promo
            </Button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-[#fffaf7] rounded-2xl p-4 border border-[#f1d7c4] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#fff1ea] flex items-center justify-center text-primary">
                    <Ticket size={18} />
                  </div>
                  <span className="text-xs text-warm-800/60 font-medium">Active Promos</span>
                </div>
                <p className="text-[2rem] leading-none font-bold text-warm-900">{stats.activePromos}</p>
              </div>
              <div className="bg-[#fffaf7] rounded-2xl p-4 border border-[#f1d7c4] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#edfdf4] flex items-center justify-center text-green-600">
                    <ShoppingCart size={18} />
                  </div>
                  <span className="text-xs text-warm-800/60 font-medium">Total Uses</span>
                </div>
                <p className="text-[2rem] leading-none font-bold text-warm-900">{stats.totalUses}</p>
              </div>
              <div className="bg-[#fffaf7] rounded-2xl p-4 border border-[#f1d7c4] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#fff3e8] flex items-center justify-center text-orange-600">
                    <Percent size={18} />
                  </div>
                  <span className="text-xs text-warm-800/60 font-medium">Total Discounts</span>
                </div>
                <p className="text-[2rem] leading-none font-bold text-warm-900">{formatCurrency(stats.totalDiscount)}</p>
              </div>
              <div className="bg-[#fffaf7] rounded-2xl p-4 border border-[#f1d7c4] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#fff0f0] flex items-center justify-center text-red-600">
                    <DollarSign size={18} />
                  </div>
                  <span className="text-xs text-warm-800/60 font-medium">PickAmGo Cost</span>
                </div>
                <p className="text-[2rem] leading-none font-bold text-warm-900">{formatCurrency(stats.pickamgoCost)}</p>
              </div>
              <div className="bg-[#fffaf7] rounded-2xl p-4 border border-[#f1d7c4] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eafaf2] flex items-center justify-center text-green-600">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-xs text-warm-800/60 font-medium">Promo Revenue</span>
                </div>
                <p className="text-[2rem] leading-none font-bold text-warm-900">{formatCurrency(stats.revenueFromPromoOrders)}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-800/45" size={18} />
                  <input
                    type="text"
                    placeholder="Search promo codes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d7c2] bg-white px-12 py-3 text-base text-warm-900 placeholder:text-warm-800/40 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="min-w-[180px] rounded-2xl border border-[#f0d7c2] bg-white px-4 py-3 text-base text-warm-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="DRAFT">Draft</option>
                <option value="EXPIRED">Expired</option>
                <option value="EXHAUSTED">Exhausted</option>
              </select>
              <select
                value={fundingFilter}
                onChange={(e) => { setFundingFilter(e.target.value); setPage(1) }}
                className="min-w-[180px] rounded-2xl border border-[#f0d7c2] bg-white px-4 py-3 text-base text-warm-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">All Funding</option>
                <option value="SELLER">Seller-funded</option>
                <option value="PICKAMGO">PickAmGo-funded</option>
              </select>
            </div>
          </div>

          {/* Promos Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-warm-800/60 text-sm">Loading promos...</p>
              </div>
            ) : promos.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] border-[2px] border-[#d6d1cb] bg-[#f8f7f5] text-[#b9b4ae]">
                  <Ticket size={42} />
                </div>
                <h3 className="text-3xl font-bold text-warm-900">No promo codes yet</h3>
                <p className="mt-3 max-w-md text-base text-warm-800/60">Create your first promotion to start giving customers discounts.</p>
                <Button
                  onClick={() => router.push('/admin/promo-codes/new')}
                  className="!mt-8 !rounded-2xl !px-7 !py-4 text-lg shadow-[0_12px_25px_rgba(249,115,22,0.22)]"
                  icon={<Plus size={20} />}
                >
                  Create Promo Code
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Discount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Funding</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Usage</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Budget</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Dates</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((promo) => (
                      <tr key={promo.id} className="border-b border-warm-100 hover:bg-warm-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-mono font-semibold text-sm text-warm-900">{promo.code}</p>
                            {promo.campaignName && <p className="text-xs text-warm-800/60">{promo.campaignName}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-warm-900">
                            {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : formatCurrency(promo.discountValue)}
                          </span>
                          {promo.maxDiscount && <span className="text-xs text-warm-800/60 block">Max: {formatCurrency(promo.maxDiscount)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[promo.status] || 'bg-gray-100 text-gray-700'}`}>
                            {promo.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${fundingColors[promo.fundingType] || 'bg-gray-100 text-gray-700'}`}>
                            {promo.fundingType === 'SELLER' ? 'Seller' : 'PickAmGo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-warm-900">
                          {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-warm-900">
                          {promo.campaignBudget ? (
                            <div>
                              <span>{formatCurrency(Number(promo.campaignSpent))}</span>
                              <span className="text-warm-800/60"> / {formatCurrency(Number(promo.campaignBudget))}</span>
                            </div>
                          ) : (
                            <span className="text-warm-800/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-warm-800/60">
                          {formatDate(promo.startAt)} - {formatDate(promo.endAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => router.push(`/admin/promo-codes/${promo.id}`)}
                              className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-800/70 hover:text-warm-900"
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                            {(promo.status === 'ACTIVE' || promo.status === 'PAUSED') && (
                              <button
                                onClick={() => handleToggleStatus(promo)}
                                className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-800/70 hover:text-warm-900"
                                title={promo.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                              >
                                {promo.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(promo.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="Delete"
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
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
