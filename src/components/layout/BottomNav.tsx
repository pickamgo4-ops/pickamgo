'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, Heart, User, PackageSearch, Bike, Shield } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import { api } from '../../lib/api'
import { Cart } from '../../types'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Search },
  { href: '/track', label: 'Tracker', icon: PackageSearch },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)
  const { user, loading, authInitialized } = useRole()

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
  }, [authInitialized, loading, pathname])

  const currentNavItems = navItems.filter((item) => {
    if (!user && item.href === '/favorites') return false
    return true
  })

  if (currentNavItems.length === 0) {
    return null
  }

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-warm-200/50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {currentNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <a
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl
                transition-all duration-200 min-w-[60px] relative
                ${isActive ? 'text-primary' : 'text-warm-800/50 hover:text-warm-800'}
              `}
            >
                <div className="relative">
                  <Icon
                    size={22}
                    className={isActive ? 'stroke-[2.5px]' : 'stroke-2'}
                  />
                  {item.label === 'Cart' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
