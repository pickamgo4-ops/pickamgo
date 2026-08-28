'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, Plus, Search, TrendingUp, DollarSign, ShoppingCart, Pause, Play, Trash2, Eye, X } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { PromoCode, PromoStats } from '@/types'
import { useRole } from '@/contexts/RoleContext'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  EXPIRED: 'bg-red-100 text-red-700',
  EXHAUSTED: 'bg-orange-100 text-orange-700',
}

export default function SellerPromoCodesPage() {
  const router = useRouter()
  const { user } = useRole()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [stats, setStats] = useState<PromoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadData()
  }, [search, statusFilter, page])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.getSellerPromos({ page, limit: 20, search: search || undefined, status: statusFilter || undefined })
      if (res.success && res.data) {
        setPromos(res.data.promos)
        setTotalPages(res.data.pagination.totalPages)
      }

      let totalUses = 0
      let totalDiscount = 0
      let totalEligibleSales = 0
      let totalSellerFunded = 0
      let uniqueCustomers = 0

      for (const promo of res.data?.promos || []) {
        totalUses += promo.stats?.totalUses || 0
        totalDiscount += promo.stats?.totalDiscount || 0
        totalEligibleSales += promo.stats?.totalEligibleSales || 0
        totalSellerFunded += promo.stats?.totalSellerFunded || 0
        uniqueCustomers += promo.stats?.uniqueCustomers || 0
      }

      setStats({
        totalUses,
        totalDiscount,
        totalEligibleSales,
        totalPickamgoExpense: 0,
        totalSellerFunded,
        totalCommission: 0,
        uniqueCustomers,
        campaignSpent: 0,
      })
    } catch (err) {
      console.error('Failed to load promos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return
    const res = await api.deleteSellerPromo(id)
    if (res.success) {
      loadData()
    }
  }

  const handleToggleStatus = async (promo: PromoCode) => {
    const newStatus = promo.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const res = await api.updateSellerPromo(promo.id, { status: newStatus })
    if (res.success) {
      loadData()
    }
  }

  const formatCurrency = (amount: number) => `GH₵${amount.toFixed(2)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <SellerSidebar>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Promo Codes</h1>
            <p className="text-warm-800/60 text-sm mt-1">Manage your shop promotions</p>
          </div>
          <Button onClick={() => router.push('/seller/promo-codes/new')} icon={<Plus size={18} />}>
            Create Promo
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart size={18} className="text-primary" />
                <span className="text-xs text-warm-800/60 font-medium">Total Uses</span>
              </div>
              <p className="text-xl font-bold text-warm-900">{stats.totalUses}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-green-600" />
                <span className="text-xs text-warm-800/60 font-medium">Eligible Sales</span>
              </div>
              <p className="text-xl font-bold text-warm-900">{formatCurrency(stats.totalEligibleSales)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-red-600" />
                <span className="text-xs text-warm-800/60 font-medium">Discounts Given</span>
              </div>
              <p className="text-xl font-bold text-warm-900">{formatCurrency(stats.totalDiscount)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <div className="flex items-center gap-2 mb-2">
                <Ticket size={18} className="text-blue-600" />
                <span className="text-xs text-warm-800/60 font-medium">Your Cost</span>
              </div>
              <p className="text-xl font-bold text-warm-900">{formatCurrency(stats.totalSellerFunded)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search promo codes..."
                value={search}
                onValueChange={setSearch}
                icon={<Search size={18} />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
              <option value="EXHAUSTED">Exhausted</option>
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
            <div className="p-8 text-center">
              <Ticket size={48} className="mx-auto text-warm-800/30 mb-3" />
              <h3 className="font-semibold text-warm-900 mb-1">No promo codes yet</h3>
              <p className="text-sm text-warm-800/60 mb-4">Create your first promotion to start giving customers discounts.</p>
              <Button onClick={() => router.push('/seller/promo-codes/new')} icon={<Plus size={18} />}>
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Usage</th>
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
                      <td className="px-4 py-3 text-sm text-warm-900">
                        {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-warm-800/60">
                        {formatDate(promo.startAt)} - {formatDate(promo.endAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/seller/promo-codes/${promo.id}`)}
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
    </SellerSidebar>
  )
}
