'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, Store, Package, Tag, Bike, FileText, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { SellerVerification } from '../../types'
import { useRole } from '../../contexts/RoleContext'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [adminLoading, setAdminLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShops: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingVerifications: 0,
    totalRiders: 0,
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
    try {
      if (!user || (!user.isAdmin && user.role !== 'admin')) {
        router.push('/')
        return
      }

      setIsAdmin(true)

      const [dashboardRes, usersRes, ordersRes, verificationsRes] = await Promise.all([
        api.get<any>('/admin/dashboard'),
        api.get<any>('/admin/users?limit=5'),
        api.get<{ orders: any[] }>('/admin/orders?limit=5'),
        api.get<SellerVerification[]>('/admin/verifications?status=pending'),
      ])

      if (dashboardRes.success && dashboardRes.data) {
        const d = dashboardRes.data
        setStats({
          totalUsers: d.totalUsers || d.users || 0,
          totalShops: d.totalShops || d.shops || 0,
          totalProducts: d.totalProducts || d.products || 0,
          totalOrders: d.totalOrders || d.orders || 0,
          pendingVerifications: d.pendingVerifications || 0,
          totalRiders: d.totalRiders || d.riders || 0,
        })
      }

      if (usersRes.success && usersRes.data) {
        setRecentUsers(Array.isArray(usersRes.data) ? usersRes.data.slice(0, 5) : [])
      }

      if (ordersRes.success && ordersRes.data) {
        setRecentOrders((ordersRes.data.orders || []).slice(0, 5))
      }

      if (verificationsRes.success && Array.isArray(verificationsRes.data)) {
        setPendingVerifications(verificationsRes.data)
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err)
    } finally {
      setAdminLoading(false)
    }
  }

  const handleVerify = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      const response = await api.patch(`/admin/verifications/${id}`, { status, rejectionReason: reason })
      if (response.success) {
        setPendingVerifications(prev => prev.filter(v => v.id !== id))
        setStats(prev => ({ ...prev, pendingVerifications: prev.pendingVerifications - 1 }))
      }
    } catch (err) {
      console.error('Failed to update verification:', err)
    }
  }

  if (!isAdmin && !adminLoading && !loading) {
    return null
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Admin Dashboard
            </h1>
            <p className="text-warm-800/60">Manage the platform</p>
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
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <p className="text-2xl font-bold text-warm-900">{stats.totalUsers}</p>
                <p className="text-xs text-warm-800/60 mt-1">Total Users</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <p className="text-2xl font-bold text-warm-900">{stats.totalShops}</p>
                <p className="text-xs text-warm-800/60 mt-1">Shops</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <p className="text-2xl font-bold text-warm-900">{stats.totalProducts}</p>
                <p className="text-xs text-warm-800/60 mt-1">Products</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <p className="text-2xl font-bold text-warm-900">{stats.totalOrders}</p>
                <p className="text-xs text-warm-800/60 mt-1">Orders</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <p className="text-2xl font-bold text-warm-900">{stats.totalRiders}</p>
                <p className="text-xs text-warm-800/60 mt-1">Riders</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200">
                <p className="text-2xl font-bold text-warm-900">{stats.pendingVerifications}</p>
                <p className="text-xs text-warm-800/60 mt-1">Pending Reviews</p>
              </div>
            </div>

            {/* Pending Verifications */}
            {pendingVerifications.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6">
                <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-primary" />
                  Pending Verifications ({pendingVerifications.length})
                </h3>
                <div className="space-y-3">
                  {pendingVerifications.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-4 bg-warm-50 rounded-xl border border-warm-200"
                    >
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
                            onClick={() => handleVerify(ver.id, 'approved')}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason:')
                              if (reason !== null) handleVerify(ver.id, 'rejected', reason)
                            }}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </div>
                      <a
                        href={ver.idDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Document
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-900">Recent Orders</h3>
                <button onClick={() => router.push('/admin/orders')} className="text-sm text-primary font-medium">
                  View All
                </button>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-warm-800/60 text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-warm-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-sm text-warm-900">
                          #{order.orderNumber || order.id.slice(-6)}
                        </p>
                        <p className="text-xs text-warm-800/60">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-warm-900">
                        GH₵{order.total?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Navigation */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4">Manage</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Users, label: 'Users', href: '/admin/users' },
                  { icon: Store, label: 'Shops', href: '/admin/shops' },
                  { icon: Package, label: 'Products', href: '/admin/products' },
                  { icon: Tag, label: 'Categories', href: '/admin/categories' },
                  { icon: Bike, label: 'Riders', href: '/admin/riders' },
                  { icon: FileText, label: 'Reports', href: '/admin/reports' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-warm-200 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center">
                      <item.icon size={20} className="text-warm-800" />
                    </div>
                    <span className="font-medium text-sm text-warm-900">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
