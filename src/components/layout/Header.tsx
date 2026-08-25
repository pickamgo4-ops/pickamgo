'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Bell, User, Plus, Menu, ShoppingCart, Store, Bike, LocateFixed, Moon, SunMedium } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { Cart } from '../../types'
import { useRole } from '@/contexts/RoleContext'
import { useTheme } from '@/components/theme/ThemeProvider'

export function Header() {
  const router = useRouter()
  const location = 'Accra'
  const [cartCount, setCartCount] = useState(0)
  const { user, loading } = useRole()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) return
        const response = await api.get<Cart>('/cart')
        if (response.success && response.data) {
          setCartCount(response.data.items?.length || 0)
        }
      } catch {
        // ignore
      }
    }
    loadCartCount()

    const handleCartUpdated = () => {
      loadCartCount()
    }
    window.addEventListener('cart-updated', handleCartUpdated)

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated)
    }
  }, [])

  const userRole = user?.role

  return (
    <header className="sticky top-0 z-50 bg-warm-50/80 backdrop-blur-md border-b border-warm-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 md:h-20 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Find It Near Me logo" className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <div className="block">
              <h1 className="font-display font-bold text-lg sm:text-xl text-warm-900 leading-tight">
                Find It Near Me
              </h1>
            </div>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex max-w-xl">
            <Input
              placeholder="Search beauty, food, sneakers, phones..."
              icon={<Search size={20} />}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  router.push(`/discover?search=${encodeURIComponent(e.currentTarget.value.trim())}`)
                }
              }}
            />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-warm-100 transition-colors">
              <MapPin size={18} className="text-primary" />
              <span className="text-sm font-medium text-warm-900">{location}</span>
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              title="Track Orders"
            >
              <LocateFixed size={20} className="text-warm-800" />
            </button>
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
            >
              <Bell size={20} className="text-warm-800" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunMedium size={18} className="text-warm-800" /> : <Moon size={18} className="text-warm-800" />}
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
            >
              <User size={20} className="text-warm-800" />
            </button>
            {userRole === 'seller' && (
              <Button
                size="sm"
                icon={<Store size={18} />}
                onClick={() => router.push('/seller')}
              >
                Dashboard
              </Button>
            )}
            {userRole === 'rider' && (
              <Button
                size="sm"
                icon={<Bike size={18} />}
                onClick={() => router.push('/rider')}
              >
                Deliveries
              </Button>
            )}
            {userRole === 'admin' && (
              <Button
                size="sm"
                icon={<Store size={18} />}
                onClick={() => router.push('/admin')}
              >
                Admin
              </Button>
            )}
            <Button
              size="sm"
              icon={<ShoppingCart size={18} />}
              onClick={() => router.push('/cart')}
            >
              Cart {cartCount > 0 && `(${cartCount})`}
            </Button>
            {!userRole && (
              <Button size="sm" icon={<Plus size={18} />} onClick={() => router.push('/sell')}>
                Sell
              </Button>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => router.push('/orders')}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              title="Track Orders"
            >
              <LocateFixed size={22} className="text-warm-800" />
            </button>
            <button
              onClick={() => router.push('/notifications')}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
            >
              <Bell size={22} className="text-warm-800" />
            </button>
          </div>
        </div>

      </div>
    </header>
  )
}
