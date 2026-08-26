'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Bell, User, Plus, Menu, ShoppingCart, Store, Bike, PackageSearch, Moon, SunMedium } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { Cart } from '../../types'
import { useRole } from '@/contexts/RoleContext'
import { useTheme } from '@/components/theme/ThemeProvider'

export function Header() {
  const router = useRouter()
  const [location, setLocation] = useState('Near you')
  const [cartCount, setCartCount] = useState(0)
  const { user, loading, authInitialized } = useRole()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const saved = localStorage.getItem('pickamgo-location')
    if (saved) setLocation('Selected location')
  }, [])

  useEffect(() => {
    if (!authInitialized || loading) return
    const loadCartCount = async () => {
      try {
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
  }, [authInitialized, loading])

  const userRole = user?.role

  return (
    <header className="sticky top-0 z-50 bg-warm-50/80 backdrop-blur-md border-b border-warm-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center h-16 md:h-20 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="Go to PickAmGo home">
            <img src="/logo.png" alt="PickAmGo logo" className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <div className="block">
              <h1 className="font-display font-bold text-lg sm:text-xl text-warm-900 leading-tight">
                PickAmGo
              </h1>
            </div>
          </Link>

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
              onClick={() => router.push('/track')}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              title="Order Tracker"
            >
              <PackageSearch size={20} className="text-warm-800" />
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
          <div className="flex md:hidden items-center gap-1 justify-self-end">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunMedium size={22} className="text-warm-800" /> : <Moon size={22} className="text-warm-800" />}
            </button>
            <button
              onClick={() => router.push('/notifications')}
              className="p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              title="Notifications"
            >
              <Bell size={22} className="text-warm-800" />
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="relative p-2.5 rounded-xl hover:bg-warm-100 transition-colors"
              title="Cart"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingCart size={22} className="text-warm-800" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[10px] leading-4 text-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </header>
  )
}
