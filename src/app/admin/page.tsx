'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Users, Store, Package, Tag, Bike, FileText, ArrowRight, CheckCircle, Clock, XCircle, Receipt, Settings, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { SellerVerification } from '@/types'
import { useRole } from '@/contexts/RoleContext'

export default function AdminDashboardPage() {
  const { user, loading, authInitialized } = useRole()
  const [adminLoading, setAdminLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBuyers: 0,
    totalSellers: 0,
    totalRiders: 0,
    totalAdmins: 0,
    totalShops: 0,
    totalProducts: 0,
    totalServices: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingSellerVerifications: 0,
    pendingShopApprovals: 0,
    pendingRiderVerifications: 0,
    activeRiders: 0,
    platformCommission: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [pendingVerifications, setPendingVerifications] = useState<SellerVerification[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    checkAdminAndLoadData()
  }, [authInitialized])

  const checkAdminAndLoadData = async () => {
    setAdminLoading(true)
    setError('')
    try {
      if (!user || (!user.isAdmin && user.role !== 'admin')) {
        return
      }

      setIsAdmin(true)

      let dashboardData: any = null
      let usersData: any = null
      let ordersData: any = null
      let verificationsData: any = null

      try {
        const dashboardRes = await api.get<any>('/admin/dashboard')
        if (dashboardRes.success && dashboardRes.data) {
          dashboardData = dashboardRes.data
        } else {
          console.error('Dashboard API error:', dashboardRes.error)
        }
      } catch (err) {
        console.error('Dashboard API exception:', err)
      }

      try {
        const usersRes = await api.get<any>('/admin/users?limit=5')
        if (usersRes.success && usersRes.data) {
          usersData = usersRes.data
        } else {
          console.error('Users API error:', usersRes.error)
        }
      } catch (err) {
        console.error('Users API exception:', err)
      }

      try {
        const ordersRes = await api.get<any>('/admin/orders?limit=5')
        if (ordersRes.success && ordersRes.data) {
          ordersData = ordersRes.data
        } else {
          console.error('Orders API error:', ordersRes.error)
        }
      } catch (err) {
        console.error('Orders API exception:', err)
      }

      try {
        const verificationsRes = await api.get<SellerVerification[]>('/admin/verifications?status=PENDING')
        if (verificationsRes.success && verificationsRes.data) {
          verificationsData = verificationsRes.data
        } else {
          console.error('Verifications API error:', verificationsRes.error)
        }
      } catch (err) {
        console.error('Verifications API exception:', err)
      }

      if (dashboardData) {
        const d = dashboardData
        const s = d.stats || {}
        setStats({
          totalUsers: s.totalUsers || 0,
          totalBuyers: s.totalBuyers || 0,
          totalSellers: s.totalSellers || 0,
          totalRiders: s.totalRiders || 0,
          totalAdmins: s.totalAdmins || 0,
          totalShops: s.totalShops || 0,
          totalProducts: s.totalProducts || 0,
          totalServices: s.totalServices || 0,
          totalOrders: s.totalOrders || 0,
          totalRevenue: s.totalRevenue || 0,
          pendingOrders: s.pendingOrders || 0,
          completedOrders: s.completedOrders || 0,
          cancelledOrders: s.cancelledOrders || 0,
          pendingSellerVerifications: s.pendingSellerVerifications || 0,
          pendingShopApprovals: s.pendingShopApprovals || 0,
          pendingRiderVerifications: s.pendingRiderVerifications || 0,
          activeRiders: s.activeRiders || 0,
          platformCommission: s.platformCommission || 0,
        })
      }

      if (usersData) {
        const usersArr = Array.isArray(usersData) ? usersData : (usersData.users || [])
        setRecentUsers(usersArr.slice(0, 5))
      }

      if (ordersData) {
        setRecentOrders((ordersData.orders || []).slice(0, 5))
      }

      if (verificationsData && Array.isArray(verificationsData)) {
        setPendingVerifications(verificationsData)
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err)
      setError('Failed to load dashboard data. Please refresh the page.')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleVerify = async (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      const response = await api.patch(`/admin/verifications/${id}/status`, { status, rejectionReason: reason })
      if (response.success) {
        setPendingVerifications(prev => prev.filter(v => v.id !== id))
        setStats(prev => ({ ...prev, pendingSellerVerifications: prev.pendingSellerVerifications - 1 }))
      }
    } catch (err) {
      console.error('Failed to update verification:', err)
    }
  }

  if (!isAdmin && !adminLoading && !loading) {
    return null
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Admin Dashboard
            </h1>
            <p className="text-warm-800/60">Platform overview</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={checkAdminAndLoadData} className="mt-4">Retry</Button>
        </Card>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, href: '/admin/orders', icon: ClipboardList },
    { label: 'Total Sales', value: `GH₵${stats.totalRevenue.toFixed(2)}`, href: '/admin/payments', icon: Receipt },
    { label: 'Total Customers', value: stats.totalUsers, href: '/admin/users', icon: Users },
    { label: 'Total Sellers', value: stats.totalSellers, href: '/admin/shops', icon: Store },
    { label: 'Total Riders', value: stats.totalRiders, href: '/admin/riders', icon: Bike },
    { label: 'Pending Orders', value: stats.pendingOrders, href: '/admin/orders', icon: Clock },
    { label: 'Pending Seller Approvals', value: stats.pendingSellerVerifications, href: '/admin/verifications', icon: FileText },
    { label: 'Pending Rider Approvals', value: stats.pendingRiderVerifications, href: '/admin/verifications', icon: Bike },
    { label: 'Pending Payouts', value: 0, href: '/admin/payouts', icon: Receipt },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Shield size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Admin Dashboard
          </h1>
          <p className="text-warm-800/60">Platform overview</p>
        </div>
      </div>

      {adminLoading || loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statCards.map((stat) => (
              <a
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 text-left hover:border-primary/30 hover:shadow-md transition-all block"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-warm-100 rounded-lg flex items-center justify-center">
                    <stat.icon size={16} className="text-warm-800" />
                  </div>
                  <span className="text-xs text-warm-800/60">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-warm-900">{stat.value}</p>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Recent Orders</h3>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-warm-800/60 text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                      <div>
                        <p className="font-medium text-sm text-warm-900">
                          #{order.orderNumber || order.id.slice(-6)}
                        </p>
                        <p className="text-xs text-warm-800/60">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                        <span className="text-sm font-bold text-warm-900">
                          GH₵{Number(order.total).toFixed(2)}
                        </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Recent Users</h3>
              {recentUsers.length === 0 ? (
                <p className="text-sm text-warm-800/60 text-center py-4">No users yet</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                      <div>
                        <p className="font-medium text-sm text-warm-900">{u.name}</p>
                        <p className="text-xs text-warm-800/60">{u.email}</p>
                      </div>
                      <span className="text-xs text-warm-800/50">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Pending Approvals</h3>
              {pendingVerifications.length === 0 ? (
                <p className="text-sm text-warm-800/60 text-center py-4">No pending verifications</p>
              ) : (
                <div className="space-y-3">
                  {pendingVerifications.slice(0, 5).map((ver) => (
                    <div key={ver.id} className="p-4 bg-warm-50 rounded-xl border border-warm-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-warm-900">
                            {ver.businessName || `User ${ver.userId}`}
                          </p>
                          <p className="text-xs text-warm-800/60">
                            {ver.idType} · {ver.idNumber}
                          </p>
                          <p className="text-xs text-warm-800/50">
                            {ver.businessType}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleVerify(ver.id, 'APPROVED')}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason:')
                              if (reason !== null) handleVerify(ver.id, 'REJECTED', reason)
                            }}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </div>
                      <a
                        href={ver.idFrontUrl || ver.idBackUrl || ver.selfieUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Document
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Manage</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Users, label: 'Users', href: '/admin/users' },
                  { icon: Store, label: 'Shops', href: '/admin/shops' },
                  { icon: Package, label: 'Products', href: '/admin/products' },
                  { icon: Tag, label: 'Categories', href: '/admin/categories' },
                  { icon: Bike, label: 'Riders', href: '/admin/riders' },
                  { icon: ClipboardList, label: 'Orders', href: '/admin/orders' },
                  { icon: Receipt, label: 'Payouts', href: '/admin/payouts' },
                  { icon: FileText, label: 'Reports', href: '/admin/reports' },
                  { icon: Settings, label: 'Settings', href: '/admin/settings' },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 p-4 rounded-xl border border-warm-200 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center">
                      <item.icon size={20} className="text-warm-800" />
                    </div>
                    <span className="font-medium text-sm text-warm-900">{item.label}</span>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
