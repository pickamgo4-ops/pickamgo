'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, LayoutDashboard, Store, Package, Tag, Archive, ShoppingBag, 
   TrendingUp, Star, MessageSquare, Bell, Settings, HelpCircle,
  Palette, CheckCircle, ChevronLeft, LogOut, Calendar,
   DollarSign, Truck, Ticket, Users, Sparkles, Shield
} from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'
import { api } from '@/lib/api'
import SellerTour from './seller/SellerTour'

type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

const shopSections = [
  {
    title: 'NAVIGATION',
    items: [
      { href: '/', label: 'Home', icon: Home },
    ],
  },
  {
    title: 'SHOP',
    items: [
      { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/seller/shop', label: 'My Shop', icon: Store },
      { href: '/seller/shipping', label: 'Shipping & Delivery', icon: Truck },
      { href: '/seller/shop/customize', label: 'Customize Shop', icon: Palette },
    ],
  },
  {
    title: 'PRODUCTS',
    items: [
      { href: '/seller/products', label: 'Products', icon: Package },
      { href: '/seller/categories', label: 'Categories', icon: Tag },
      { href: '/seller/inventory', label: 'Inventory', icon: Archive },
      { href: '/seller/collections', label: 'Collections', icon: Package },
    ],
  },
  {
    title: 'SALES',
    items: [
      { href: '/seller/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/seller/bookings', label: 'Bookings', icon: Calendar },
      { href: '/seller/booking-setup', label: 'Booking Setup', icon: Sparkles },
    ],
  },
  {
    title: 'ORDER MANAGEMENT',
    items: [
      { href: '/seller/manage-orders', label: 'Manage Orders', icon: CheckCircle },
    ],
  },
  {
    title: 'EARNINGS',
    items: [
      { href: '/seller/payouts', label: 'Payouts', icon: DollarSign },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { href: '/seller/analytics', label: 'Analytics', icon: TrendingUp },
      { href: '/seller/reviews', label: 'Reviews', icon: Star },
      { href: '/seller/promo-codes', label: 'Promo Codes', icon: Ticket },
      { href: '/seller/promotions', label: 'Clearance & Promotions', icon: Sparkles },
      { href: '/seller/qr-code', label: 'QR Code', icon: Store },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { href: '/seller/messages', label: 'Messages', icon: MessageSquare },
      { href: '/seller/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { href: '/seller/settings', label: 'Shop Settings', icon: Settings },
      { href: '/seller/delivery-settings', label: 'Delivery Settings', icon: Truck },
      { href: '/seller/verification', label: 'Verification', icon: CheckCircle },
      { href: '/seller/trust', label: 'Trust Center', icon: Shield },
      { href: '/seller/help', label: 'Help', icon: HelpCircle },
    ],
  },
]

export function SellerSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useRole()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {})
    } catch {
      // ignore
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('auth-changed'))
    router.push('/auth/login')
  }

  const [tourStatus, setTourStatus] = useState<TourStatus | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const response = await api.get<{ status: TourStatus }>('/seller/tour/status')
        if (response.success && response.data) {
          setTourStatus(response.data.status)
        }
      } catch {
        // ignore
      }
    }
    checkTourStatus()
  }, [])

  useEffect(() => {
    const handleTourStatusChange = (event: Event) => {
      const status = (event as CustomEvent<TourStatus>).detail
      if (status) setTourStatus(status)
    }
    window.addEventListener('seller-tour-status-changed', handleTourStatusChange)
    return () => window.removeEventListener('seller-tour-status-changed', handleTourStatusChange)
  }, [])

  const restartTour = useCallback(async () => {
    try {
      await api.post('/seller/tour/status', { status: 'IN_PROGRESS' })
      localStorage.setItem('seller-tour-current-step', '0')
      window.location.reload()
    } catch {
      // ignore
    }
  }, [])

  const sectionColorMap: Record<string, { bg: string; text: string; light: string }> = {
    SHOP: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
    PRODUCTS: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
    SALES: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
    'ORDER MANAGEMENT': { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
    EARNINGS: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' },
    BUSINESS: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
    COMMUNICATION: { bg: 'bg-teal-500', text: 'text-teal-600', light: 'bg-teal-50' },
    SETTINGS: { bg: 'bg-warm-500', text: 'text-warm-700', light: 'bg-warm-100' },
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 ring-1 ring-primary/20 shrink-0 flex items-center justify-center text-white font-bold text-sm">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'Seller'}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            ) : null}
            <div className="h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/70" style={{ display: user?.avatar ? 'none' : 'flex' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-warm-900 dark:text-white truncate">PickAmGo Seller</h2>
            <p className="text-xs text-warm-800/60 dark:text-warm-200/60 truncate">{user?.name}</p>
            <p className="text-xs text-primary/70 dark:text-primary-light/70 font-medium">Where Every Pick Finds You</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {shopSections.map((section) => {
          const colors = sectionColorMap[section.title] || sectionColorMap['SETTINGS']

          return (
            <div key={section.title}>
              <h3 className="text-[10px] font-bold text-warm-800/50 dark:text-warm-200/50 uppercase tracking-wider px-2 mb-1.5">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/seller' && pathname.startsWith(item.href))
                  const Icon = item.icon

                  return (
                    <button
                      key={item.href}
                      data-tour-target={item.href}
                      onClick={() => {
                        router.push(item.href)
                        setIsOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                        transition-all duration-200 text-sm font-medium
                        ${isActive 
                          ? `${colors.light} ${colors.text} dark:bg-warm-800` 
                          : 'text-warm-800/70 dark:text-warm-200/70 hover:bg-warm-100 dark:hover:bg-warm-800 hover:text-warm-900 dark:hover:text-warm-100'
                        }
                      `}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-warm-200 dark:border-warm-700">
        {tourStatus === 'NOT_STARTED' && (
          <button
            onClick={restartTour}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all mb-1"
            aria-label="Restart Seller Dashboard Tour"
          >
            <Sparkles size={18} className="flex-shrink-0" />
            <span>Take Seller Tour</span>
          </button>
        )}
        {pathname === '/seller/help' && (
          <button
            onClick={restartTour}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-primary dark:text-primary-light hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
            aria-label="Restart Seller Dashboard Tour"
          >
            <Sparkles size={18} className="flex-shrink-0" />
            <span>Restart Seller Tour</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </>
  )

  return (
    <SellerTour>
      <div className="min-h-screen overflow-x-hidden bg-warm-50 dark:bg-warm-950">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white dark:bg-warm-900 border-r border-warm-200 dark:border-warm-700 flex-col z-40">
          <SidebarContent />
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-warm-900 border-b border-warm-200 dark:border-warm-700 flex items-center px-4 z-40">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -ml-2 rounded-xl hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            {isOpen ? <ChevronLeft size={24} className="text-warm-900 dark:text-warm-100" /> : <LayoutDashboard size={24} className="text-warm-900 dark:text-warm-100" />}
          </button>
          <span className="font-display font-bold text-warm-900 dark:text-warm-100 ml-2 truncate">Seller Dashboard</span>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={() => setIsOpen(false)} />
            <aside
              data-mobile-sidebar
              className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-warm-900 shadow-xl flex flex-col"
            >
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
    </SellerTour>
  )
}
