'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

export default function SellerNotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/notifications?limit=50')
      if (response.success && response.data) {
        setNotifications(response.data.notifications || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {})
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {
      // ignore
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all', {})
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading notifications...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Notifications</h1>
            <p className="text-warm-800/60 mt-1">{notifications.filter(n => !n.isRead).length} unread</p>
          </div>
          {notifications.some(n => !n.isRead) && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} icon={<CheckCheck size={16} />}>
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No notifications</h3>
            <p className="text-sm text-warm-800/60">You'll see notifications here when you receive updates</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer transition-all ${
                  !notification.isRead ? 'border-primary/30 bg-primary/5' : ''
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    !notification.isRead ? 'bg-primary/10' : 'bg-warm-100'
                  }`}>
                    <Bell size={18} className={!notification.isRead ? 'text-primary' : 'text-warm-800/60'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-warm-900">{notification.title}</h4>
                      <span className="text-xs text-warm-800/50">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-warm-800/70">{notification.message}</p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
