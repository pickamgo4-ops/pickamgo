'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Bike, Eye, Loader2, XCircle, CheckCircle, X, Ban } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminRider {
  id: string
  name: string
  email: string
  phone?: string
  isOnline: boolean
  isAvailable: boolean
  isVerified: boolean
  totalDeliveries: number
  rating: number
  totalEarnings: number
  createdAt: string
}

interface RiderDetail {
  id: string
  name: string
  email: string
  phone?: string
  isOnline: boolean
  isAvailable: boolean
  isVerified: boolean
  totalDeliveries: number
  rating: number
  totalEarnings: number
  vehicleType: string
  vehicleNumber?: string
  createdAt: string
  recentDeliveries?: any[]
  earningsHistory?: any[]
}

function mapRider(r: any): AdminRider {
  return {
    id: r.id,
    name: r.user?.name || '-',
    email: r.user?.email || '-',
    phone: r.user?.phone || undefined,
    isOnline: !!r.isOnline,
    isAvailable: !!r.isAvailable,
    isVerified: !!r.isVerified,
    totalDeliveries: r.deliveriesCount ?? 0,
    rating: Number(r.rating) || 0,
    totalEarnings: Number(r.earnings) || 0,
    createdAt: r.createdAt,
  }
}

function mapRiderDetail(r: any): RiderDetail {
  return {
    id: r.id,
    name: r.user?.name || '-',
    email: r.user?.email || '-',
    phone: r.user?.phone || undefined,
    isOnline: !!r.isOnline,
    isAvailable: !!r.isAvailable,
    isVerified: !!r.isVerified,
    totalDeliveries: r.deliveriesCount ?? 0,
    rating: Number(r.rating) || 0,
    totalEarnings: Number(r.earnings) || 0,
    vehicleType: r.vehicleType || r.licenseNumber || '-',
    vehicleNumber: r.licenseNumber || undefined,
    createdAt: r.createdAt,
    recentDeliveries: r.deliveries || [],
    earningsHistory: r.earnings || [],
  }
}

export default function AdminRidersPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [riders, setRiders] = useState<AdminRider[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')
  const [onlineFilter, setOnlineFilter] = useState('')
  const [selectedRider, setSelectedRider] = useState<RiderDetail | null>(null)
  const [riderLoading, setRiderLoading] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadRiders()
  }, [authInitialized, user, page, verifiedFilter, onlineFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadRiders(1, searchQuery, verifiedFilter, onlineFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadRiders = async (pageNum = page, search = searchQuery, verified = verifiedFilter, online = onlineFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (verified) params.set('verified', verified)
      if (online) params.set('online', online)

      const response = await api.get<any>(`/admin/riders?${params.toString()}`)
      if (response.success && response.data) {
        setRiders((response.data.riders || []).map(mapRider))
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load riders')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const loadRiderDetail = async (riderId: string) => {
    setRiderLoading(true)
    try {
      const response = await api.get<any>(`/admin/riders/${riderId}`)
      if (response.success && response.data) {
        setSelectedRider(mapRiderDetail(response.data))
      }
    } catch {
      console.error('Failed to load rider detail')
    } finally {
      setRiderLoading(false)
    }
  }

  const handleRiderClick = (r: AdminRider) => {
    loadRiderDetail(r.id)
  }

  const updateRider = async (riderId: string, action: 'APPROVE' | 'SUSPEND' | 'ONLINE' | 'OFFLINE') => {
    const rider = riders.find(r => r.id === riderId)
    if (!rider) return
    const labels: Record<string, string> = { APPROVE: 'approve', SUSPEND: 'suspend', ONLINE: 'set online', OFFLINE: 'set offline' }
    if (!window.confirm(`Are you sure you want to ${labels[action]} "${rider.name}"?`)) return

    const data: any = {}
    if (action === 'APPROVE') data.isVerified = true
    else if (action === 'SUSPEND') data.isVerified = false
    else if (action === 'ONLINE') data.isOnline = true
    else if (action === 'OFFLINE') data.isOnline = false

    const response = await api.patch(`/admin/riders/${riderId}`, data)
    if (response.success) {
      setRiders(prev => prev.map(r => {
        if (r.id !== riderId) return r
        return {
          ...r,
          isVerified: data.isVerified !== undefined ? data.isVerified : r.isVerified,
          isOnline: data.isOnline !== undefined ? data.isOnline : r.isOnline,
        }
      }))
      if (selectedRider?.id === riderId) {
        setSelectedRider(prev => prev ? {
          ...prev,
          isVerified: data.isVerified !== undefined ? data.isVerified : prev.isVerified,
          isOnline: data.isOnline !== undefined ? data.isOnline : prev.isOnline,
        } : null)
      }
    }
  }

  const getVerifiedBadge = (isVerified: boolean) => {
    return isVerified ? (
      <Badge variant="verified">Verified</Badge>
    ) : (
      <Badge variant="default">Unverified</Badge>
    )
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-xs ${star <= Math.round(rating) ? 'text-yellow-500' : 'text-warm-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  if (loading || !authInitialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Bike size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Riders
          </h1>
          <p className="text-warm-800/60 text-sm">Manage delivery riders</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="pl-9"
          />
        </div>
        <select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All verification statuses</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select
          value={onlineFilter}
          onChange={(e) => { setOnlineFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All statuses</option>
          <option value="true">Online</option>
          <option value="false">Offline</option>
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading riders...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadRiders()} className="mt-4">Retry</Button>
        </Card>
      ) : riders.length === 0 ? (
        <Card className="p-12 text-center">
          <Bike size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No riders found</p>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Rider</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Deliveries</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Rating</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {riders.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => handleRiderClick(r)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-warm-900">{r.name}</p>
                          <p className="text-xs text-warm-800/50">{r.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {getVerifiedBadge(r.isVerified)}
                          <Badge variant={r.isAvailable ? 'deal' : 'default'}>
                            {r.isAvailable ? 'Available' : 'Busy'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{r.totalDeliveries}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {renderStars(r.rating)}
                        <span className="text-xs text-warm-800/60 ml-1">{r.rating.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-warm-900 hidden lg:table-cell">
                        GH₵{r.totalEarnings?.toFixed(2)}
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

      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedRider(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">Rider Details</h2>
                <button onClick={() => setSelectedRider(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>

              {riderLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : selectedRider ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Name</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedRider.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Email</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedRider.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Phone</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedRider.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Vehicle</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedRider.vehicleType}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Deliveries</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedRider.totalDeliveries}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Earnings</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">GH₵{selectedRider.totalEarnings?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getVerifiedBadge(selectedRider.isVerified)}
                    <Badge variant={selectedRider.isAvailable ? 'deal' : 'default'}>
                      {selectedRider.isAvailable ? 'Available' : 'Busy'}
                    </Badge>
                    <Badge variant={selectedRider.isOnline ? 'verified' : 'default'}>
                      {selectedRider.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-warm-800/50 uppercase">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {!selectedRider.isVerified && (
                        <Button size="sm" onClick={() => updateRider(selectedRider.id, 'APPROVE')}>
                          <CheckCircle size={16} />
                          Approve
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => updateRider(selectedRider.id, 'SUSPEND')}>
                        <Ban size={16} />
                        Suspend
                      </Button>
                      {selectedRider.isOnline ? (
                        <Button size="sm" variant="outline" onClick={() => updateRider(selectedRider.id, 'OFFLINE')}>
                          Set Offline
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => updateRider(selectedRider.id, 'ONLINE')}>
                          Set Online
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
