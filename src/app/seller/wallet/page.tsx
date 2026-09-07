'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, ShoppingBag, Users, Eye, Package } from 'lucide-react'
import { SellerWalletSummary, SellerWalletTransaction } from '@/types'

export default function SellerWalletPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useRole()
  const [summary, setSummary] = useState<SellerWalletSummary | null>(null)
  const [transactions, setTransactions] = useState<SellerWalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user?.isSeller) {
      router.push('/seller')
      return
    }
    loadWallet()
  }, [user, authLoading])

  const loadWallet = async () => {
    setLoading(true)
    try {
      const [summaryRes, txRes] = await Promise.all([
        api.get<any>('/seller/wallet/summary'),
        api.get<any>('/seller/wallet/transactions?limit=50'),
      ])

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data)
      }
      if (txRes.success && txRes.data) {
        setTransactions(txRes.data.transactions || [])
      }
    } catch (err) {
      console.error('Failed to load wallet:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `GH₵${Number(amount || 0).toFixed(2)}`

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-warm-800/60">Loading wallet...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (!user?.isSeller) return null

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <Wallet size={24} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Wallet</h1>
            <p className="text-warm-800/60">Earnings and payouts</p>
          </div>
        </div>

        {summary && (
          <div className="space-y-4 mb-8">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <p className="text-sm text-warm-800/60 mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-warm-900">{formatCurrency(summary.availableBalance)}</p>
              {summary.pendingPayout > 0 && (
                <p className="text-sm text-warm-800/60 mt-1">Pending payout: {formatCurrency(summary.pendingPayout)}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => router.push('/seller/payouts')} icon={<ArrowUpRight size={18} />}>Withdraw</Button>
                <Button variant="ghost" onClick={() => router.push('/seller/payouts')}>History</Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="text-xs text-warm-800/60">Gross Sales</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{formatCurrency(summary.gross)}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight size={16} className="text-red-500" />
                  <span className="text-xs text-warm-800/60">Commission</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{formatCurrency(summary.commission)}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag size={16} className="text-primary" />
                  <span className="text-xs text-warm-800/60">Net Earnings</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{formatCurrency(summary.net)}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight size={16} className="text-warm-800/60" />
                  <span className="text-xs text-warm-800/60">Withdrawn</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{formatCurrency(summary.withdrawnAmount)}</p>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag size={16} className="text-warm-800/60" />
                  <span className="text-xs text-warm-800/60">Orders</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{summary.orders}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-warm-800/60" />
                  <span className="text-xs text-warm-800/60">Customers</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{summary.customers}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye size={16} className="text-warm-800/60" />
                  <span className="text-xs text-warm-800/60">Views</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{summary.views}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package size={16} className="text-warm-800/60" />
                  <span className="text-xs text-warm-800/60">Products</span>
                </div>
                <p className="text-lg font-bold text-warm-900">{summary.products}</p>
              </Card>
            </div>
          </div>
        )}

        <Card className="p-6">
          <h3 className="font-semibold text-warm-900 mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-warm-800/50 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-warm-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-warm-900">{tx.description || tx.type}</p>
                    {tx.order && (
                      <p className="text-xs text-warm-800/50">Order #{tx.order.orderNumber}</p>
                    )}
                    <p className="text-xs text-warm-800/50">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <Badge variant={tx.status === 'SUCCESS' ? 'verified' : tx.status === 'PENDING' ? 'default' : 'deal'} className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
