'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, Truck, Clock, DollarSign, Wallet,
  Bell, MessageCircle, User, Shield, Bike, Settings, HelpCircle,
  LogOut, ChevronLeft, Home, FileText
} from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import { api } from '@/lib/api'
import { RiderAuthGuard, RiderLoadingState } from '@/components/RiderAuthGuard'

const riderSections: Array<{
  title: string
  items: Array<{ href: string; label: string; icon: any }>
}> = [
  {
    title: 'NAVIGATION',
    items: [
      { href: '/', label: 'Home', icon: Home },
    ],
  },
  {
    title: 'DELIVERY',
    items: [
      { href: '/rider', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/rider/deliveries/available', label: 'Available Deliveries', icon: Package },
      { href: '/rider/deliveries/active', label: 'Active Delivery', icon: Truck },
      { href: '/rider/deliveries/history', label: 'Delivery History', icon: Clock },
    ],
  },
  {
    title: 'EARNINGS',
    items: [
      { href: '/rider/earnings', label: 'Earnings', icon: DollarSign },
      { href: '/rider/payouts', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { href: '/rider/notifications', label: 'Notifications', icon: Bell },
      { href: '/rider/messages', label: 'Messages', icon: MessageCircle },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { href: '/rider/profile', label: 'Profile', icon: User },
      { href: '/rider/verification', label: 'Verification', icon: Shield },
      { href: '/rider/vehicle', label: 'Vehicle', icon: Bike },
      { href: '/rider/settings', label: 'Settings', icon: Settings },
      { href: '/rider/help', label: 'Help', icon: HelpCircle },
      { href: '/rider/terms', label: 'Terms', icon: FileText },
    ],
  },
]

export function RiderSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useRole()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {})
    } catch {
      // ignore - still clear local state
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    clearAuth()
    window.dispatchEvent(new Event('auth-changed'))
    router.replace('/auth/login')
  }

  const isActivePath = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/rider') return pathname === '/rider' || pathname?.startsWith('/rider/') === false
    return pathname === href || (href !== '/' && pathname?.startsWith(href))
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-warm-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">
            R
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-warm-900 truncate">PickAmGo Rider</h2>
            <p className="text-xs text-warm-800/60 truncate">{user?.name || 'Rider'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {riderSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-[10px] font-bold text-warm-800/50 uppercase tracking-wider px-2 mb-1.5">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(item.href)
                const Icon = item.icon

                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                      transition-all duration-200 text-sm font-medium
                      ${active
                        ? 'bg-primary/10 text-primary'
                        : 'text-warm-800/70 hover:bg-warm-100 hover:text-warm-900'}
                    `}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-warm-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </>
  )

  return (
    <RiderAuthGuard>
      <div className="min-h-screen bg-warm-50">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-warm-200 flex-col z-40">
          <SidebarContent />
        </aside>

          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-warm-200 flex items-center px-4 z-40">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 -ml-2 rounded-xl hover:bg-warm-100"
            >
              {isOpen ? <ChevronLeft size={24} /> : <LayoutDashboard size={24} />}
            </button>
            <span className="font-display font-bold text-warm-900 ml-2 truncate">Rider Dashboard</span>
          </div>

          {/* Mobile Sidebar Overlay */}
          {isOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
              <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col overflow-y-auto">
                <SidebarContent />
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className="md:ml-64 min-w-0 max-w-full overflow-x-hidden pt-14 md:pt-0">
            <div className="max-w-7xl mx-auto min-w-0 p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </RiderAuthGuard>
    )
  }
