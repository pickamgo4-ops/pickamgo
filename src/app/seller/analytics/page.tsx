'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Package, Star, Users, ShoppingBag, Eye, Clock } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

export default function SellerAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/seller/analytics')
      if (response.success && response.data) {
        setAnalytics(response.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading analytics...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  if (!analytics || !analytics.shop) {
    return (
      <SellerSidebar>
        <div className="text-center py-20">
          <TrendingUp size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">No shop found</h3>
          <p className="text-sm text-warm-800/60">Create a shop to see analytics</p>
        </div>
      </SellerSidebar>
    )
  }

  const { stats, topProducts, recentOrders } = analytics

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Analytics</h1>
          <p className="text-warm-800/60 mt-1">Track your shop performance</p>
        </div>

        {(!stats || (stats.totalOrders === 0 && stats.totalRevenue === 0)) ? (
          <Card className="p-12 text-center">
            <TrendingUp size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No analytics data yet</h3>
            <p className="text-sm text-warm-800/60">Your analytics will appear here once customers interact with your shop.</p>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag size={16} className="text-primary" />
                  <span className="text-xs text-warm-800/60">Orders</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.totalOrders || 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-xs text-warm-800/60">Revenue</span>
                </div>
                <p className="text-xl font-bold text-warm-900">GH₵{(stats.totalRevenue || 0).toFixed(2)}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} className="text-purple-500" />
                  <span className="text-xs text-warm-800/60">Products</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.totalProducts || 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-orange-500" />
                  <span className="text-xs text-warm-800/60">Pending</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.pendingOrders || 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-pink-500" />
                  <span className="text-xs text-warm-800/60">Followers</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.followersCount || 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-yellow-500" />
                  <span className="text-xs text-warm-800/60">Reviews</span>
                </div>
                <p className="text-xl font-bold text-warm-900">{stats.totalReviews || 0}</p>
              </Card>
            </div>

            {/* Top Products */}
            {topProducts && topProducts.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  Top Products
                </h3>
                <div className="space-y-3">
                  {topProducts.map((product: any, idx: number) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 bg-warm-50 rounded-xl">
                      <span className="text-lg font-bold text-warm-800/40 w-6">{idx + 1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-warm-200 flex-shrink-0">
                        <img
                          src={product.images?.[0]?.url || ''}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-warm-900 truncate">{product.name}</p>
                        <p className="text-xs text-warm-800/60">{product.category?.name || 'Uncategorized'}</p>
                      </div>
                      <span className="font-bold text-warm-900">GH₵{product.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Orders */}
            {recentOrders && recentOrders.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-warm-900 mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {recentOrders.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                      <div>
                        <p className="font-medium text-sm text-warm-900">#{order.orderNumber}</p>
                        <p className="text-xs text-warm-800/60">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-bold text-warm-900">GH₵{order.total?.toFixed(2) || '0.00'}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </SellerSidebar>
  )
}
