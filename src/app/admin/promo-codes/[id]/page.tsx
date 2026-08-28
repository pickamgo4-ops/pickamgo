'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Ticket, TrendingUp, DollarSign, Users, ShoppingCart, Wallet, Shield, Edit, Trash2, Pause, Play, Copy, CheckCircle, XCircle, Clock } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { PromoCode, PromoRedemption, PromoStats } from '@/types'
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

export default function AdminPromoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useRole()
  const [promo, setPromo] = useState<PromoCode | null>(null)
  const [stats, setStats] = useState<PromoStats | null>(null)
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (params.id) loadPromo(params.id as string)
  }, [params.id])

  const loadPromo = async (id: string) => {
    setLoading(true)
    try {
      const res = await api.getAdminPromo(id)
      if (res.success && res.data) {
        setPromo(res.data)
        setStats(res.data.stats)
        setRedemptions(res.data.redemptions || [])
      }
    } catch (err) {
      console.error('Failed to load promo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!promo || !confirm('Are you sure you want to delete this promo code?')) return
    const res = await api.deleteAdminPromo(promo.id)
    if (res.success) {
      router.push('/admin/promo-codes')
    }
  }

  const handleToggleStatus = async () => {
    if (!promo) return
    const newStatus = promo.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const res = await api.updateAdminPromo(promo.id, { status: newStatus })
    if (res.success) {
      loadPromo(promo.id)
    }
  }

  const copyCode = () => {
    if (promo) {
      navigator.clipboard.writeText(promo.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatCurrency = (amount: number) => `GH₵${amount.toFixed(2)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 min-w-0 max-w-full overflow-x-hidden pt-14 md:pt-0">
          <div className="max-w-7xl mx-auto min-w-0 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!promo) {
    return (
      <div className="min-h-screen">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 min-w-0 max-w-full overflow-x-hidden pt-14 md:pt-0">
          <div className="max-w-7xl mx-auto min-w-0 p-4 md:p-6 lg:p-8">
            <div className="text-center py-20">
              <p className="text-warm-800/60">Promo code not found</p>
              <Button className="mt-4" onClick={() => router.push('/admin/promo-codes')}>Back to Promos</Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 min-w-0 max-w-full overflow-x-hidden pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto min-w-0 p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
                <ArrowLeft size={20} className="text-warm-800" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 font-mono">{promo.code}</h1>
                  <button
                    onClick={copyCode}
                    className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-800/70"
                    title="Copy code"
                  >
                    {copied ? <CheckCircle size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                {promo.campaignName && <p className="text-warm-800/60 text-sm mt-1">{promo.campaignName}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              {(promo.status === 'ACTIVE' || promo.status === 'PAUSED') && (
                <Button variant="outline" onClick={handleToggleStatus} icon={promo.status === 'ACTIVE' ? <Pause size={18} /> : <Play size={18} />}>
                  {promo.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push(`/admin/promo-codes/${promo.id}/edit`)} icon={<Edit size={18} />}>
                Edit
              </Button>
              <Button variant="ghost" onClick={handleDelete} className="text-red-600 hover:bg-red-50" icon={<Trash2 size={18} />}>
                Delete
              </Button>
            </div>
          </div>

          {/* Status & Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <p className="text-xs text-warm-800/60 font-medium mb-1">Status</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[promo.status]}`}>{promo.status}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <p className="text-xs text-warm-800/60 font-medium mb-1">Funding</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${fundingColors[promo.fundingType]}`}>{promo.fundingType === 'SELLER' ? 'Seller-funded' : 'PickAmGo-funded'}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <p className="text-xs text-warm-800/60 font-medium mb-1">Discount</p>
              <p className="font-semibold text-warm-900">{promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : formatCurrency(promo.discountValue)}{promo.maxDiscount && ` (max ${formatCurrency(promo.maxDiscount)})`}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
              <p className="text-xs text-warm-800/60 font-medium mb-1">Min Order</p>
              <p className="font-semibold text-warm-900">{formatCurrency(promo.minimumOrderAmount)}</p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={18} className="text-primary" />
                  <span className="text-xs text-warm-800/60 font-medium">Total Uses</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.totalUses}</p>
                <p className="text-xs text-warm-800/60">{stats.uniqueCustomers} unique customers</p>
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
                  <span className="text-xs text-warm-800/60 font-medium">Total Discounts</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{formatCurrency(stats.totalDiscount)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={18} className="text-purple-600" />
                  <span className="text-xs text-warm-800/60 font-medium">PickAmGo Expense</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{formatCurrency(stats.totalPickamgoExpense)}</p>
              </div>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6">
            <h3 className="font-semibold text-warm-900 mb-4">Financial Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-warm-800/60 mb-1">PickAmGo Commission</p>
                <p className="font-semibold text-warm-900">{formatCurrency(stats?.totalCommission || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-warm-800/60 mb-1">Seller-funded Amount</p>
                <p className="font-semibold text-warm-900">{formatCurrency(stats?.totalSellerFunded || 0)}</p>
              </div>
              {promo.fundingType === 'PICKAMGO' && promo.campaignBudget && (
                <>
                  <div>
                    <p className="text-xs text-warm-800/60 mb-1">Campaign Budget</p>
                    <p className="font-semibold text-warm-900">{formatCurrency(promo.campaignBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-warm-800/60 mb-1">Budget Remaining</p>
                    <p className="font-semibold text-warm-900">{formatCurrency((promo.campaignBudget || 0) - (promo.campaignSpent || 0))}</p>
                  </div>
                </>
              )}
            </div>
            {promo.fundingType === 'PICKAMGO' && promo.campaignBudget && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-warm-800/60 mb-1">
                  <span>Budget spent</span>
                  <span>{Math.round((promo.campaignSpent / promo.campaignBudget) * 100)}%</span>
                </div>
                <div className="w-full bg-warm-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((promo.campaignSpent / promo.campaignBudget) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Usage History */}
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-warm-200">
              <h3 className="font-semibold text-warm-900">Usage History</h3>
              <p className="text-xs text-warm-800/60 mt-1">Orders that used this promo code</p>
            </div>
            {redemptions.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart size={32} className="mx-auto text-warm-800/30 mb-2" />
                <p className="text-sm text-warm-800/60">No redemptions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Order</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Customer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Original</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Discount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Final</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-warm-800/60 uppercase tracking-wider">Funding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((redemption) => (
                      <tr key={redemption.id} className="border-b border-warm-100 hover:bg-warm-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-warm-900">{redemption.orderId.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-xs text-warm-800/60">{formatDate(redemption.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-warm-900">{redemption.customerId ? 'User' : 'Guest'}</td>
                        <td className="px-4 py-3 text-sm text-warm-900">{formatCurrency(redemption.originalSubtotal)}</td>
                        <td className="px-4 py-3 text-sm text-red-600 font-medium">-{formatCurrency(redemption.discountAmount)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-warm-900">{formatCurrency(redemption.discountedSubtotal)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${fundingColors[redemption.fundingSource]}`}>
                            {redemption.fundingSource === 'SELLER' ? 'Seller' : 'PickAmGo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
