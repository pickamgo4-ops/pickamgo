'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { RiderProfile, RiderDeliveryItem, RiderDashboardData, RiderEarningsSummary, RiderEarningsRecord, RiderNotification } from '../types/rider'

export interface ApiError {
  success: false
  error: string
}

export function useRider() {
  const [rider, setRider] = useState<RiderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRider = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getRiderProfile()
      if (res.success && res.data) {
        const profile = res.data as any
        setRider({
          id: profile.id,
          userId: profile.userId,
          isOnline: profile.isOnline,
          isAvailable: profile.isAvailable,
          vehicleType: profile.vehicleType,
          vehicleNumber: profile.vehicleNumber,
          licenseNumber: profile.licenseNumber,
          totalDeliveries: profile.totalDeliveries || profile.deliveriesCount || 0,
          rating: profile.rating || 0,
          totalEarnings: profile.totalEarnings || 0,
          isVerified: profile.isVerified || false,
          user: profile.user ?? {
            id: profile.userId,
            name: profile.user?.name || '',
            email: profile.user?.email || '',
            phone: profile.user?.phone || '',
            avatar: profile.user?.avatar || '',
            location: profile.user?.location || '',
          },
          createdAt: profile.createdAt || '',
          updatedAt: profile.updatedAt || '',
        })
      } else {
        setError(res.error || 'Failed to load rider profile')
      }
    } catch {
      setError('Failed to load rider profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (isOnline?: boolean, isAvailable?: boolean) => {
    try {
      const updates: Record<string, boolean> = {}
      if (isOnline !== undefined) updates.isOnline = isOnline
      if (isAvailable !== undefined) updates.isAvailable = isAvailable
      const res = await api.patch<any>('/riders/me/status', updates)
      if (res.success && res.data) {
        setRider(prev => prev ? { ...prev, isOnline: res.data.isOnline, isAvailable: res.data.isAvailable } : null)
        return { success: true }
      }
      return { success: false, error: res.error || 'Failed to update status' }
    } catch {
      return { success: false, error: 'Failed to update status' }
    }
  }, [])

  const toggleOnline = useCallback(async () => {
    if (!rider) return { success: false, error: 'No rider data' }
    const nextOnline = !rider.isOnline
    const nextAvailable = nextOnline
    return updateStatus(nextOnline, nextAvailable)
  }, [rider, updateStatus])

  return { rider, loading, error, loadRider, updateStatus, toggleOnline, refresh: loadRider }
}

export function useAvailableDeliveries(autoRefreshMs = 10000) {
  const [deliveries, setDeliveries] = useState<RiderDeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    if (!loading) setRefreshing(true)
    try {
      const res = await api.get<any>('/riders/deliveries')
      if (res.success && res.data) {
        setDeliveries(res.data.availableDeliveries || [])
      } else {
        setError(res.error || 'Failed to load deliveries')
      }
    } catch {
      setError('Failed to load deliveries')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [loading])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefreshMs) return
    const interval = setInterval(load, autoRefreshMs)
    return () => clearInterval(interval)
  }, [load, autoRefreshMs])

  return { deliveries, loading, refreshing, error, refresh: load }
}

export function useActiveDelivery(autoRefreshMs = 10000) {
  const [delivery, setDelivery] = useState<RiderDeliveryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id?: string) => {
    setError(null)
    try {
      const endpoint = id ? `/riders/deliveries/${id}` : '/riders/deliveries'
      const res = await api.get<any>(endpoint)
      if (res.success && res.data) {
        if (id) {
          setDelivery(res.data)
        } else {
          setDelivery(res.data.activeDelivery || null)
        }
      } else {
        setError(res.error || 'Failed to load active delivery')
      }
    } catch {
      setError('Failed to load active delivery')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefreshMs || !delivery) return
    const interval = setInterval(() => load(delivery.id), autoRefreshMs)
    return () => clearInterval(interval)
  }, [load, autoRefreshMs, delivery?.id])

  return { delivery, loading, error, refresh: load }
}

export function useDeliveryDetail(id: string | null) {
  const [delivery, setDelivery] = useState<RiderDeliveryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await api.getRiderDeliveryDetail(id)
      if (res.success && res.data) {
        setDelivery(res.data)
      } else {
        setError(res.error || 'Failed to load delivery')
      }
    } catch {
      setError('Failed to load delivery')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { delivery, loading, error, refresh: load }
}

export function useRiderEarnings() {
  const [earnings, setEarnings] = useState<RiderEarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.getRiderEarningsHistory()
      if (res.success && res.data) {
        setEarnings({
          todayEarnings: res.data.todayEarnings || 0,
          weekEarnings: res.data.weekEarnings || 0,
          monthEarnings: res.data.monthEarnings || 0,
          totalEarnings: res.data.totalEarnings || 0,
          pendingEarnings: res.data.pendingEarnings || 0,
          availableBalance: res.data.availableBalance || 0,
          totalWithdrawn: res.data.totalWithdrawn || 0,
          records: (res.data.records || []).map((r: any) => ({
            id: r.id,
            orderId: r.orderId,
            deliveryId: r.deliveryId,
            orderNumber: r.orderNumber || '',
            grossAmount: Number(r.grossAmount),
            platformFee: Number(r.platformFee),
            netAmount: Number(r.netAmount),
            status: r.status,
            availableAt: r.availableAt,
            withdrawnAt: r.withdrawnAt,
            createdAt: r.createdAt,
          })) as RiderEarningsRecord[],
          pagination: res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
      } else {
        setError(res.error || 'Failed to load earnings')
      }
    } catch {
      setError('Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { earnings, loading, error, refresh: load }
}

export function useRiderNotifications() {
  const [notifications, setNotifications] = useState<RiderNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unreadCount = notifications.filter(n => !n.isRead).length

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get<any>('/notifications?limit=50')
      if (res.success && res.data) {
        setNotifications(res.data.notifications || [])
      } else {
        setError(res.error || 'Failed to load notifications')
      }
    } catch {
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {})
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {
      // ignore
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all', {})
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }, [])

  return { notifications, loading, error, unreadCount, markAsRead, markAllAsRead, refresh: load }
}

export function useRiderConversations() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get<any>('/messages/conversations')
      if (res.success && res.data) {
        setConversations(res.data.conversations || res.data || [])
      } else {
        setError(res.error || 'Failed to load conversations')
      }
    } catch {
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { conversations, loading, error, refresh: load }
}

export function usePayouts() {
  const [balances, setBalances] = useState<any>(null)
  const [methods, setMethods] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [balancesRes, methodsRes, historyRes] = await Promise.all([
        api.get<any>('/payouts/balances'),
        api.get<any>('/payouts/methods'),
        api.get<any>('/payouts/history?limit=50'),
      ])
      if (balancesRes.success) setBalances(balancesRes.data)
      if (methodsRes.success) setMethods(methodsRes.data || [])
      if (historyRes.success) setHistory(historyRes.data?.payouts || historyRes.data || [])
    } catch {
      setError('Failed to load payout data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { balances, methods, history, loading, error, refresh: load }
}