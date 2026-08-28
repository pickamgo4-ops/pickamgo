'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Bike, Eye, Loader2, XCircle, X, CheckCircle2, Ban, Shield, ShieldOff, UserCheck, UserX, AlertTriangle } from 'lucide-react'
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
  status: string
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
  status: string
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
    status: r.status || 'ACTIVE',
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
    status: r.status || 'ACTIVE',
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

function getStatusBadge(status: string) {
  const config: Record<string, { variant: any; label: string; icon: any }> = {
    ACTIVE: { variant: 'verified', label: 'Active', icon: CheckCircle2 },
    SUSPENDED: { variant: 'default', label: 'Suspended', icon: ShieldOff },
    BANNED: { variant: 'deal', label: 'Banned', icon: Ban },
  }
  const c = config[status] || config.ACTIVE
  const Icon = c.icon
  return (
    <Badge variant={c.variant} className="flex items-center gap-1 w-fit">
      <Icon size={12} />
      {c.label}
    </Badge>
  )
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
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRider, setSelectedRider] = useState<RiderDetail | null>(null)
  const [riderLoading, setRiderLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; riderId: string; action: string } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const loadingRef = useRef(false)

  const loadRiders = useCallback(async (pageNum: number, search: string, verified: string, online: string, status: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (verified) params.set('verified', verified)
      if (online) params.set('online', online)
      if (status) params.set('status', status)

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
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadRiders(page, searchQuery, verifiedFilter, onlineFilter, statusFilter)
  }, [authInitialized, user, page, verifiedFilter, onlineFilter, statusFilter, loadRiders, router])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadRiders(1, searchQuery, verifiedFilter, onlineFilter, statusFilter)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery, statusFilter, loadRiders, verifiedFilter, onlineFilter])

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

  const executeAction = async () => {
    if (!actionDialog) return
    setActionLoading(actionDialog.riderId)
    try {
      const endpoint = `/admin/riders/${actionDialog.riderId}/${actionDialog.action.toLowerCase()}`
      const response = await api.post(endpoint, actionReason ? { reason: actionReason } : {})
      if (response.success) {
        setRiders(prev => prev.map(r => {
          if (r.id !== actionDialog.riderId) return r
          if (actionDialog.action === 'SUSPEND') return { ...r, status: 'SUSPENDED' }
          if (actionDialog.action === 'BAN') return { ...r, status: 'BANNED' }
          if (actionDialog.action === 'REACTIVATE') return { ...r, status: 'ACTIVE' }
          if (actionDialog.action === 'APPROVE') return { ...r, isVerified: true }
          if (actionDialog.action === 'REJECT') return { ...r, isVerified: false }
          return r
        }))
        if (selectedRider?.id === actionDialog.riderId) {
          setSelectedRider(prev => prev ? {
            ...prev,
            status: actionDialog.action === 'SUSPEND' ? 'SUSPENDED' : actionDialog.action === 'BAN' ? 'BANNED' : actionDialog.action === 'REACTIVATE' ? 'ACTIVE' : prev.status,
            isVerified: actionDialog.action === 'APPROVE' ? true : actionDialog.action === 'REJECT' ? false : prev.isVerified,
          } : null)
        }
        setActionDialog(null)
        setActionReason('')
      } else {
        setError(response.error || 'Action failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const renderActions = (rider: AdminRider) => {
    const isSuspended = rider.status === 'SUSPENDED'
    const isBanned = rider.status === 'BANNED'
    const isVerified = rider.isVerified

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleRiderClick(rider) }}
          title="View"
          className="p-2 rounded-lg hover:bg-warm-100 text-warm-800"
        >
          <Eye size={16} />
        </button>
        {!isVerified && !isSuspended && !isBanned && (
          <button
            onClick={(e) => { e.stopPropagation(); setActionDialog({ open: true, riderId: rider.id, action: 'APPROVE' }) }}
            title="Approve"
            className="p-2 rounded-lg hover:bg-green-50 text-green-600"
          >
            <UserCheck size={16} />
          </button>
        )}
        {!isVerified && !isSuspended && !isBanned && (
          <button
            onClick={(e) => { e.stopPropagation(); setActionDialog({ open: true, riderId: rider.id, action: 'REJECT' }) }}
            title="Reject"
            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
          >
            <UserX size={16} />
          </button>
        )}
        {!isSuspended && !isBanned && (
          <button
            onClick={(e) => { e.stopPropagation(); setActionDialog({ open: true, riderId: rider.id, action: 'SUSPEND' }) }}
            title="Suspend"
            className="p-2 rounded-lg hover:bg-yellow-50 text-yellow-600"
          >
            <ShieldOff size={16} />
          </button>
        )}
        {!isBanned && (
          <button
            onClick={(e) => { e.stopPropagation(); setActionDialog({ open: true, riderId: rider.id, action: 'BAN' }) }}
            title="Ban"
            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
          >
            <Ban size={16} />
          </button>
        )}
        {(isSuspended || isBanned) && (
          <button
            onClick={(e) => { e.stopPropagation(); setActionDialog({ open: true, riderId: rider.id, action: 'REACTIVATE' }) }}
            title="Reactivate"
            className="p-2 rounded-lg hover:bg-green-50 text-green-600"
          >
            <Shield size={16} />
          </button>
        )}
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
            Riders / Deliverers
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
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All account statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
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
          <Button onClick={() => loadRiders(page, searchQuery, verifiedFilter, onlineFilter, statusFilter)} className="mt-4">Retry</Button>
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
                    <th className="px-4 py-3 font-semibold text-warm-800/70 text-right">Actions</th>
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
                          {getStatusBadge(r.status)}
                          <Badge variant={r.isAvailable ? 'deal' : 'default'}>
                            {r.isAvailable ? 'Available' : 'Busy'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{r.totalDeliveries}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span
                              key={star}
                              className={`text-xs ${star <= Math.round(r.rating) ? 'text-yellow-500' : 'text-warm-300'}`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="text-xs text-warm-800/60 ml-1">{r.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-warm-900 hidden lg:table-cell">
                        GH₵{r.totalEarnings?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {renderActions(r)}
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
                    {getStatusBadge(selectedRider.status)}
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
                      {selectedRider.status === 'ACTIVE' && !selectedRider.isVerified && (
                        <Button size="sm" onClick={() => setActionDialog({ open: true, riderId: selectedRider.id, action: 'APPROVE' })}>
                          <UserCheck size={16} />
                          Approve
                        </Button>
                      )}
                      {selectedRider.status === 'ACTIVE' && (
                        <Button size="sm" variant="outline" onClick={() => setActionDialog({ open: true, riderId: selectedRider.id, action: 'SUSPEND' })}>
                          <ShieldOff size={16} />
                          Suspend
                        </Button>
                      )}
                      {selectedRider.status !== 'BANNED' && (
                        <Button size="sm" variant="outline" onClick={() => setActionDialog({ open: true, riderId: selectedRider.id, action: 'BAN' })}>
                          <Ban size={16} />
                          Ban
                        </Button>
                      )}
                      {(selectedRider.status === 'SUSPENDED' || selectedRider.status === 'BANNED') && (
                        <Button size="sm" onClick={() => setActionDialog({ open: true, riderId: selectedRider.id, action: 'REACTIVATE' })}>
                          <Shield size={16} />
                          Reactivate
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

      {actionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-yellow-600" />
                <h3 className="font-display text-xl font-bold text-warm-900">
                  {actionDialog.action === 'SUSPEND' ? 'Suspend Rider' : actionDialog.action === 'BAN' ? 'Ban Rider' : actionDialog.action === 'REACTIVATE' ? 'Reactivate Rider' : actionDialog.action === 'APPROVE' ? 'Approve Rider' : 'Reject Rider'}
                </h3>
              </div>
              <p className="text-sm text-warm-800/60 mb-4">
                {actionDialog.action === 'SUSPEND' && 'This will suspend the rider account. The rider will not be able to accept new deliveries.'}
                {actionDialog.action === 'BAN' && 'This will permanently ban the rider account. The rider will no longer be able to use the platform.'}
                {actionDialog.action === 'REACTIVATE' && 'This will restore the rider account to active status.'}
                {actionDialog.action === 'APPROVE' && 'This will approve the rider verification.'}
                {actionDialog.action === 'REJECT' && 'This will reject the rider verification.'}
              </p>
              <div className="mb-4">
                <label className="text-sm font-medium text-warm-900 mb-1.5 block">Reason (optional)</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter a reason..."
                  rows={3}
                  className="w-full rounded-xl border border-warm-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setActionDialog(null); setActionReason('') }}>
                  Cancel
                </Button>
                <Button onClick={executeAction} disabled={!!actionLoading} variant={actionDialog.action === 'BAN' || actionDialog.action === 'SUSPEND' ? 'outline' : 'primary'}>
                  {actionLoading ? 'Processing...' : `Confirm ${actionDialog.action}`}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
