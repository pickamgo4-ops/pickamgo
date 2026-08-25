'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Package, Bike, CheckCircle, XCircle } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await api.get<any[]>('/notifications')
      if (response.success && response.data) {
        setNotifications(Array.isArray(response.data) ? response.data : [])
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER': return Package
      case 'ORDER_DELIVERED': return CheckCircle
      case 'RIDER_ASSIGNED': return Bike
      case 'SELLER_VERIFIED': return CheckCircle
      case 'SELLER_VERIFICATION_REJECTED': return XCircle
      default: return Bell
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'NEW_ORDER': return 'text-blue-600 bg-blue-50'
      case 'ORDER_DELIVERED': return 'text-green-600 bg-green-50'
      case 'RIDER_ASSIGNED': return 'text-purple-600 bg-purple-50'
      case 'SELLER_VERIFIED': return 'text-green-600 bg-green-50'
      case 'SELLER_VERIFICATION_REJECTED': return 'text-red-600 bg-red-50'
      default: return 'text-warm-800 bg-warm-100'
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-6">
          Notifications
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading notifications...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              No notifications yet
            </h2>
            <p className="text-warm-800/60">
              You&apos;ll receive notifications about your orders, deliveries, and account here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type)
              const colorClass = getColor(notification.type)
              return (
                <div
                  key={notification.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-warm-900 mb-0.5">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-warm-800/70 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-warm-800/50">
                        {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
