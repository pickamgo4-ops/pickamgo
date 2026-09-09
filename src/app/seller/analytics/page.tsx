'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Package, Star, Users, ShoppingBag, Eye, Clock } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

export default function SellerAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  const [apiError, setApiError] = useState('')
  const [section, setSection] = useState('Overview')
  const [range, setRange] = useState('30d')
  const [productViews, setProductViews] = useState<any>(null)
  const [viewsLoading, setViewsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [ranking, setRanking] = useState('totalViews')

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    const queryProduct = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('product') : null
    if (queryProduct) {
      setSection('Product Views')
      setSelectedProduct(queryProduct)
    }
  }, [])

  useEffect(() => {
    if (section !== 'Product Views') return
    const loadProductViews = async () => {
      setViewsLoading(true)
      const response = await api.get<any>(`/seller/analytics/product-views?range=${range}`)
      if (response.success) setProductViews(response.data)
      setViewsLoading(false)
    }
    void loadProductViews()
  }, [section, range])

  useEffect(() => {
    if (!selectedProduct || typeof selectedProduct !== 'string') return
    api.get<any>(`/seller/analytics/products/${selectedProduct}?range=${range}`).then(response => {
      if (response.success) setSelectedProduct(response.data)
    })
  }, [selectedProduct, range])

  const loadAnalytics = async () => {
    setLoading(true)
    setApiError('')
    try {
      const response = await api.get<any>('/seller/analytics')
      if (response.success && response.data) {
        setAnalytics(response.data)
      } else {
        setApiError(response.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Analytics load error:', err)
      setApiError('Something went wrong. Please try again.')
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

  if (apiError) {
    return (
      <SellerSidebar>
        <div className="text-center py-20">
          <TrendingUp size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">Unable to load analytics</h3>
          <p className="text-sm text-warm-800/60 mb-4">{apiError}</p>
          <Button onClick={loadAnalytics}>Try Again</Button>
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
          <p className="text-sm text-warm-800/60 mb-4">Create a shop to see analytics</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => router.push('/seller/shop/create')}>Create Shop</Button>
            <Button variant="ghost" onClick={() => router.push('/')}>Go back home</Button>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  const { stats, topProducts, recentOrders } = analytics

  const sections = ['Overview', 'Product Views', 'Sales', 'Customers', 'Top Products']
  const viewSummary = productViews?.summary || { totalViews: 0, uniqueViewers: 0, addToCarts: 0, wishlists: 0, purchases: 0, conversionRate: 0, comparison: 0 }
  const chartMax = Math.max(...(productViews?.trend || []).map((point: any) => point.views), 1)
  const rankedProducts = [...(productViews?.products || [])].sort((a, b) => Number(b[ranking] || 0) - Number(a[ranking] || 0))

  if (section === 'Product Views') {
    return (
      <SellerSidebar>
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Product Views</h1><p className="text-warm-800/60 mt-1">Aggregated customer interest, never individual viewer identities.</p></div>
            <select value={range} onChange={event => setRange(event.target.value)} className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm"><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option></select>
          </div>
          <div className="flex flex-wrap gap-2">{sections.map(item => <Button key={item} size="sm" variant={section === item ? 'primary' : 'outline'} onClick={() => setSection(item)}>{item}</Button>)}</div>
          {viewsLoading ? <p className="py-16 text-center text-warm-800/60">Loading product analytics...</p> : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {[['Total views', viewSummary.totalViews], ['Unique viewers', viewSummary.uniqueViewers], ['Add to carts', viewSummary.addToCarts], ['Wishlists', viewSummary.wishlists], ['Purchases', viewSummary.purchases], ['Conversion', `${viewSummary.conversionRate}%`]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs text-warm-800/60">{label}</p><p className="mt-2 text-xl font-bold text-warm-900">{value}</p></Card>)}
              </div>
              <Card className="p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-warm-900">Views over time</h2><span className="text-sm text-warm-800/60">{viewSummary.comparison >= 0 ? '+' : ''}{viewSummary.comparison}% vs previous period</span></div><div className="mt-6 flex h-48 items-end gap-1 border-b border-warm-200">{(productViews?.trend || []).map((point: any) => <div key={point.date} title={`${point.date}: ${point.views} views`} className="flex-1 rounded-t bg-primary/80 hover:bg-primary" style={{ height: `${Math.max((point.views / chartMax) * 100, 3)}%` }} />)}</div><div className="mt-2 flex justify-between text-[10px] text-warm-800/50"><span>{productViews?.trend?.[0]?.date || ''}</span><span>{productViews?.trend?.at(-1)?.date || ''}</span></div></Card>
              {selectedProduct && typeof selectedProduct !== 'string' && <Card className="p-6"><h2 className="font-display text-xl font-bold text-warm-900">{selectedProduct.product.name}</h2><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">{[['Views', selectedProduct.analytics.totalViews], ['Unique viewers', selectedProduct.analytics.uniqueViewers], ['Add to carts', selectedProduct.analytics.addToCarts], ['Wishlists', selectedProduct.analytics.wishlists], ['Purchases', selectedProduct.analytics.purchases], ['Conversion', `${selectedProduct.analytics.conversionRate}%`]].map(([label, value]) => <div key={label}><p className="text-xs text-warm-800/60">{label}</p><p className="font-bold text-warm-900">{value}</p></div>)}</div><p className="mt-4 text-sm text-warm-800/60">Best-performing days: {selectedProduct.analytics.bestDays.map((day: any) => `${day.date} (${day.views})`).join(', ') || 'No views yet'}</p></Card>}
              <Card className="p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-warm-900">Top products</h2><select value={ranking} onChange={event => setRanking(event.target.value)} className="rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm"><option value="totalViews">Most viewed</option><option value="addToCarts">Most added to cart</option><option value="wishlists">Most wishlisted</option><option value="purchases">Most purchased</option><option value="conversionRate">Highest conversion</option></select></div><div className="space-y-2">{rankedProducts.slice(0, 10).map((product: any) => <button key={product.id} onClick={() => setSelectedProduct(product.id)} className="flex w-full items-center gap-3 rounded-xl bg-warm-50 p-3 text-left hover:bg-warm-100"><div className="h-10 w-10 overflow-hidden rounded-lg bg-warm-200"><img src={product.image} alt="" className="h-full w-full object-cover" /></div><span className="min-w-0 flex-1 truncate font-medium text-warm-900">{product.name}</span><span className="text-sm font-semibold text-warm-800">{Number(product[ranking] || 0)}{ranking === 'conversionRate' ? '%' : ''}</span></button>)}</div></Card>
            </>
          )}
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Analytics</h1>
          <p className="text-warm-800/60 mt-1">Track your shop performance</p>
        </div>

        <div className="flex flex-wrap gap-2">{sections.map(item => <Button key={item} size="sm" variant={section === item ? 'primary' : 'outline'} onClick={() => setSection(item)}>{item}</Button>)}</div>

        {section === 'Customers' && <Card className="p-6"><h2 className="font-semibold text-warm-900">Customers</h2><p className="mt-2 text-3xl font-bold text-warm-900">{stats.totalCustomers || 0}</p><p className="text-sm text-warm-800/60">Unique customers with orders from your shop</p></Card>}
        {section === 'Sales' && <Card className="p-6"><h2 className="font-semibold text-warm-900">Sales</h2><p className="mt-2 text-sm text-warm-800/60">Revenue and order totals are shown below. Product conversion and purchase trends are available under Product Views.</p></Card>}
        {section === 'Top Products' && <Card className="p-6"><h2 className="font-semibold text-warm-900">Top Products</h2><p className="mt-2 text-sm text-warm-800/60">Your highest-performing catalog items are listed below. Use Product Views for view, cart, wishlist, purchase, and conversion rankings.</p></Card>}

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
