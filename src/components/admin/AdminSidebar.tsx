'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Tag,
  Store,
  Users,
  Bike,
  Truck,
  Receipt,
  DollarSign,
  Calendar,
  MessageSquare,
  Star,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import { api } from '@/lib/api'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/shops', label: 'Sellers', icon: Store },
  { href: '/admin/riders', label: 'Riders / Deliverers', icon: Bike },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/deliveries', label: 'Deliveries', icon: Truck },
  { href: '/admin/payments', label: 'Payments', icon: Receipt },
  { href: '/admin/payouts', label: 'Withdrawals', icon: DollarSign },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useRole()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {})
    } catch {
      // ignore logout API errors
    } finally {
      clearAuth()
      window.location.href = '/'
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-warm-200 transform transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-auto md:block
          ${open ? 'translate-x-0' : '-translate-x-full'}
          dark:bg-warm-900 dark:border-warm-200
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-200">
            <Link href="/admin" className="flex items-center gap-2.5" onClick={onClose}>
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-warm-900 dark:text-warm-900 leading-tight">
                  PickAmGo
                </h1>
                <p className="text-[11px] text-warm-800/60 dark:text-warm-800/60 font-medium">
                  Admin Panel
                </p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-warm-100 md:hidden text-warm-800"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-warm-800 hover:bg-warm-100 dark:hover:bg-warm-100 dark:text-warm-800'
                    }
                  `}
                >
                  <item.icon size={18} className={active ? 'text-primary' : 'text-warm-800/70'} />
                  <span className="dark:text-warm-900">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-warm-200 dark:border-warm-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 w-full text-sm font-medium transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
