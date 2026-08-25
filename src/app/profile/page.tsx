'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Heart, Package, MapPin, Bell, Shield, HelpCircle, LogOut, ChevronRight, Store, Bike, ShoppingCart } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

      if (!token || !userData) {
        router.push('/auth/login')
        return
      }

      const user = JSON.parse(userData)
      setUser(user)
    } catch {
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading profile...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  const menuItems = [
    { icon: Package, label: 'My Orders', href: '/orders' },
    { icon: Heart, label: 'Favorites', href: '/favorites' },
    { icon: MapPin, label: 'Addresses', href: '/addresses' },
    { icon: ShoppingCart, label: 'Cart', href: '/cart' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: Shield, label: 'Account & Security', href: '/security' },
    { icon: HelpCircle, label: 'Help & Support', href: '/help' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  const sellerItems = user?.isSeller ? [
    { icon: Store, label: 'Seller Dashboard', href: '/seller' },
  ] : []

  const riderItems = user?.isRider ? [
    { icon: Bike, label: 'Rider Dashboard', href: '/ride' },
  ] : []

  const dynamicItems = [...sellerItems, ...riderItems]

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6">
          <div className="flex items-center gap-4">
            <Avatar
              src={user?.avatar}
              alt={user?.name || 'User'}
              size="xl"
              fallback={user?.name?.charAt(0) || 'U'}
            />
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-warm-900">
                {user?.name || 'User'}
              </h1>
              <p className="text-warm-800/60 text-sm">{user?.email}</p>
              <p className="text-warm-800/60 text-sm flex items-center gap-1 mt-1">
                <MapPin size={14} />
                {user?.location || 'Accra, Ghana'}
              </p>
            </div>
            <button onClick={() => router.push('/settings')} className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors">
              <Settings size={20} className="text-warm-800" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {(user?.isSeller || user?.isRider) && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6">
            <h2 className="font-semibold text-warm-900 mb-4">Dashboards</h2>
            <div className="grid grid-cols-2 gap-3">
              {dynamicItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-warm-200 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <span className="font-medium text-sm text-warm-900">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden mb-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-warm-50 transition-colors text-left ${
                  index < menuItems.length - 1 ? 'border-b border-warm-100' : ''
                }`}
              >
                <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center">
                  <Icon size={20} className="text-warm-800" />
                </div>
                <span className="flex-1 font-medium text-warm-900">{item.label}</span>
                <ChevronRight size={18} className="text-warm-800/40" />
              </button>
            )
          })}
        </div>

        {/* Logout */}
        <Button variant="outline" fullWidth icon={<LogOut size={18} />} onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
          Log Out
        </Button>
      </main>

      <BottomNav />
    </div>
  )
}
