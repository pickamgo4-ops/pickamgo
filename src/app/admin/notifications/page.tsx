'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Bell, Eye, Loader2, XCircle, X, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminNotification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  user: { id: string; name: string; email: string }
}

export default function AdminNotificationsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [readFilter, setReadFilter] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadNotifications()
  }, [authInitialized, user, page, readFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadNotifications(1, searchQuery, readFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadNotifications = async (pageNum = page, search = searchQuery, read = readFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (read) params.set('isRead', read)

      const response = await api.get<any>(`/admin/notifications?${params.toString()}`)
      if (response.success && response.data) {
        setNotifications(response.data.notifications || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load notifications')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setActionLoading(true)
    try {
      await api.patch(`/admin/notifications/${notificationId}/read`, {})
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n))
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(prev => prev ? { ...prev, isRead: true } : null)
      }
    } catch {
      console.error('Failed to mark notification as read')
    } finally {
      setActionLoading(false)
    }
  }

  const markAllAsRead = async () => {
    setActionLoading(true)
    try {
      await api.patch('/admin/notifications/read-all', {})
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      console.error('Failed to mark all notifications as read')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return

    setActionLoading(true)
    try {
      await api.delete(`/admin/notifications/${notificationId}`)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null)
      }
    } catch {
      console.error('Failed to delete notification')
    } finally {
      setActionLoading(false)
    }
  }

  const getTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      NEW_BOOKING: { variant: 'deal', label: 'Booking' },
      BOOKING_CONFIRMED: { variant: 'verified', label: 'Confirmed' },
      BOOKING_CANCELLED: { variant: 'default', label: 'Cancelled' },
      NEW_MESSAGE: { variant: 'new', label: 'Message' },
      ORDER_UPDATE: { variant: 'delivery', label: 'Order' },
      PAYOUT: { variant: 'verified', label: 'Payout' },
      SYSTEM: { variant: 'default', label: 'System' },
    }
    const c = config[type] || { variant: 'default', label: type }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  if (loading || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Bell size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Notifications
            </h1>
            <p className="text-warm-800/60 text-sm">Monitor platform notifications</p>
          </div>
        </div>
        <Button onClick={markAllAsRead} disabled={actionLoading || notifications.every(n => n.isRead)}>
          <CheckCircle size={16} />
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search by title, message, or user..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="pl-9"
          />
        </div>
        <select
          value={readFilter}
          onChange={(e) => { setReadFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading notifications...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadNotifications()} className="mt-4">Retry</Button>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No notifications found</p>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">User</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Type</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Message</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {notifications.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedNotification(n)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-warm-900">{n.user.name}</p>
                          <p className="text-xs text-warm-800/50">{n.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getTypeBadge(n.type)}</td>
                      <td className="px-4 py-3 text-warm-800/70 hidden md:table-cell line-clamp-1">
                        {n.message}
                      </td>
                      <td className="px-4 py-3">
                        {n.isRead ? (
                          <Badge variant="verified">Read</Badge>
                        ) : (
                          <Badge variant="default">Unread</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!n.isRead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(n.id) }}
                              disabled={actionLoading}
                              className="p-2 rounded-xl hover:bg-warm-100 text-warm-800"
                              title="Mark as read"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                            disabled={actionLoading}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedNotification(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">Notification Details</h2>
                <button onClick={() => setSelectedNotification(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Title</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedNotification.title}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Message</label>
                  <p className="text-sm text-warm-900 mt-1">{selectedNotification.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">User</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedNotification.user.name}</p>
                    <p className="text-xs text-warm-800/60">{selectedNotification.user.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                    <div className="mt-1">
                      {selectedNotification.isRead ? (
                        <Badge variant="verified">Read</Badge>
                      ) : (
                        <Badge variant="default">Unread</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-warm-800/50">
                  Created: {new Date(selectedNotification.createdAt).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  {!selectedNotification.isRead && (
                    <Button onClick={() => markAsRead(selectedNotification.id)} disabled={actionLoading}>
                      <CheckCircle size={16} />
                      Mark as read
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => deleteNotification(selectedNotification.id)} disabled={actionLoading}>
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
