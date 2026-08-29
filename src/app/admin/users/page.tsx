'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Package, Eye, Loader2, XCircle, X, Trash2, CheckCircle2, Ban, Shield, ShieldOff, UserCheck, UserX, AlertTriangle, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface UserDetail {
  id: string
  name: string
  email: string
  phone: string
  role: string
  isSeller: boolean
  isRider: boolean
  isAdmin: boolean
  isVerified: boolean
  suspended?: boolean
  banned?: boolean
  createdAt: string
  addresses?: any[]
  orderCount?: number
}

interface AdminUser {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  isSeller: boolean
  isRider: boolean
  isAdmin: boolean
  isVerified: boolean
  suspended?: boolean
  banned?: boolean
  createdAt: string
}

function deriveRole(u: any): string {
  if (u.isAdmin) return 'admin'
  if (u.isRider) return 'rider'
  if (u.isSeller) return 'seller'
  return 'buyer'
}

function mapUser(u: any): AdminUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || undefined,
    role: deriveRole(u),
    isSeller: !!u.isSeller,
    isRider: !!u.isRider,
    isAdmin: !!u.isAdmin,
    isVerified: !!u.emailVerified || !!u.phoneVerified,
    suspended: !!u.suspended,
    banned: !!u.banned,
    createdAt: u.createdAt,
  }
}

function mapUserDetail(u: any): UserDetail {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    role: deriveRole(u),
    isSeller: !!u.isSeller,
    isRider: !!u.isRider,
    isAdmin: !!u.isAdmin,
    isVerified: !!u.emailVerified || !!u.phoneVerified,
    suspended: !!u.suspended,
    banned: !!u.banned,
    createdAt: u.createdAt,
    addresses: u.addresses || [],
    orderCount: u._count?.customerOrders ?? u.orderCount ?? 0,
  }
}

function getRoleBadge(role: string) {
  const config: Record<string, { variant: any; label: string }> = {
    buyer: { variant: 'default', label: 'Buyer' },
    seller: { variant: 'deal', label: 'Seller' },
    rider: { variant: 'delivery', label: 'Rider' },
    admin: { variant: 'verified', label: 'Admin' },
  }
  const c = config[role] || config.buyer
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function getStatusBadge(user: AdminUser) {
  if (user.banned) return <Badge variant="deal">Banned</Badge>
  if (user.suspended) return <Badge variant="default">Suspended</Badge>
  if (user.isVerified) return <Badge variant="verified">Verified</Badge>
  return <Badge variant="default">Unverified</Badge>
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; userId: string; action: string } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const loadingRef = useRef(false)

  const loadUsers = useCallback(async (pageNum: number, search: string, role: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (role) params.set('role', role)

      const response = await api.get<any>(`/admin/users?${params.toString()}`)
      if (response.success && response.data) {
        setUsers((response.data.users || []).map(mapUser))
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load users')
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
    loadUsers(page, searchQuery, roleFilter)
  }, [authInitialized, user, page, searchQuery, roleFilter, loadUsers, router])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadUsers(1, searchQuery, roleFilter)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery, roleFilter, loadUsers])

  const loadUserDetail = async (userId: string) => {
    setUserLoading(true)
    try {
      const response = await api.get<any>(`/admin/users/${userId}`)
      if (response.success && response.data) {
        setSelectedUser(mapUserDetail(response.data))
      }
    } catch {
      console.error('Failed to load user detail')
    } finally {
      setUserLoading(false)
    }
  }

  const handleUserClick = (u: AdminUser) => {
    loadUserDetail(u.id)
  }

  const toggleRole = async (userId: string, field: 'isSeller' | 'isRider' | 'isAdmin') => {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const current = user[field]
    const action = current ? 'disable' : 'enable'
    if (!window.confirm(`Are you sure you want to ${action} ${field.replace('is', '')} access for ${user.name}?`)) return

    const response = await api.patch(`/admin/users/${userId}`, { [field]: !current })
    if (response.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: !current } : u))
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, [field]: !current } : null)
      }
    }
  }

  const executeUserAction = async () => {
    if (!actionDialog) return
    setActionLoading(actionDialog.userId)
    try {
      const payload = actionDialog.action === 'REACTIVATE'
        ? { suspended: false, banned: false, reason: actionReason || undefined }
        : {
            suspended: actionDialog.action === 'SUSPEND',
            banned: actionDialog.action === 'BAN',
            reason: actionReason || undefined,
          }

      const response = await api.patch(`/admin/users/${actionDialog.userId}/status`, payload)
      if (response.success) {
        const nextSuspended = actionDialog.action === 'SUSPEND'
        const nextBanned = actionDialog.action === 'BAN'

        setUsers(prev => prev.map(u => {
          if (u.id !== actionDialog.userId) return u
          return {
            ...u,
            suspended: actionDialog.action === 'REACTIVATE' ? false : nextSuspended,
            banned: actionDialog.action === 'REACTIVATE' ? false : nextBanned,
          }
        }))
        if (selectedUser?.id === actionDialog.userId) {
          setSelectedUser(prev => prev ? {
            ...prev,
            suspended: actionDialog.action === 'REACTIVATE' ? false : nextSuspended,
            banned: actionDialog.action === 'REACTIVATE' ? false : nextBanned,
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

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      buyer: { variant: 'default', label: 'Buyer' },
      seller: { variant: 'deal', label: 'Seller' },
      rider: { variant: 'delivery', label: 'Rider' },
      admin: { variant: 'verified', label: 'Admin' },
    }
    const c = config[role] || config.buyer
    return <Badge variant={c.variant}>{c.label}</Badge>
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
          <Package size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Customers
          </h1>
          <p className="text-warm-800/60 text-sm">Manage platform users</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="rider">Rider</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading users...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadUsers(page, searchQuery, roleFilter)} className="mt-4">Retry</Button>
        </Card>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <Eye size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No users found</p>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Name</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Email</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Phone</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Role</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => handleUserClick(u)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-warm-900">{u.name}</td>
                      <td className="px-4 py-3 text-warm-800/70">{u.email}</td>
                      <td className="px-4 py-3 text-warm-800/70 hidden md:table-cell">{u.phone || '-'}</td>
                      <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">{getStatusBadge(u)}</td>
                      <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
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

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedUser(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">User Details</h2>
                <button onClick={() => setSelectedUser(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>

              {userLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : selectedUser ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Name</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedUser.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Email</label>
                      <p className="text-sm font-medium text-warm-900 mt-1 flex items-center gap-1">
                        <Mail size={14} className="text-warm-800/50" />
                        {selectedUser.email}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Phone</label>
                      <p className="text-sm font-medium text-warm-900 mt-1 flex items-center gap-1">
                        <Phone size={14} className="text-warm-800/50" />
                        {selectedUser.phone || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Orders</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedUser.orderCount || 0}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser)}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-warm-800/50 uppercase">Access Controls</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedUser.isSeller ? 'primary' : 'outline'}
                        onClick={() => toggleRole(selectedUser.id, 'isSeller')}
                      >
                        Seller: {selectedUser.isSeller ? 'ON' : 'OFF'}
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedUser.isRider ? 'primary' : 'outline'}
                        onClick={() => toggleRole(selectedUser.id, 'isRider')}
                      >
                        Rider: {selectedUser.isRider ? 'ON' : 'OFF'}
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedUser.isAdmin ? 'primary' : 'outline'}
                        onClick={() => toggleRole(selectedUser.id, 'isAdmin')}
                      >
                        Admin: {selectedUser.isAdmin ? 'ON' : 'OFF'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-warm-800/50 uppercase">Account Moderation</p>
                    <div className="flex flex-wrap gap-2">
                      {!selectedUser.suspended && !selectedUser.banned && (
                        <Button size="sm" variant="outline" onClick={() => setActionDialog({ open: true, userId: selectedUser.id, action: 'SUSPEND' })}>
                          <ShieldOff size={16} />
                          Suspend
                        </Button>
                      )}
                      {!selectedUser.banned && (
                        <Button size="sm" variant="outline" onClick={() => setActionDialog({ open: true, userId: selectedUser.id, action: 'BAN' })}>
                          <Ban size={16} />
                          Ban
                        </Button>
                      )}
                      {(selectedUser.suspended || selectedUser.banned) && (
                        <Button size="sm" onClick={() => setActionDialog({ open: true, userId: selectedUser.id, action: 'REACTIVATE' })}>
                          <Shield size={16} />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-warm-800/50 uppercase mb-2">Addresses</p>
                      <div className="space-y-2">
                         {selectedUser.addresses.map((addr: any) => (
                            <div key={addr.id} className="p-3 bg-warm-50 rounded-xl text-sm">
                              <p className="font-medium text-warm-900">{addr.label}</p>
                              <p className="text-warm-800/70">{addr.address}{addr.city ? `, ${addr.city}` : ''}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
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
                  {actionDialog.action === 'SUSPEND' ? 'Suspend User' : actionDialog.action === 'BAN' ? 'Ban User' : 'Reactivate User'}
                </h3>
              </div>
              <p className="text-sm text-warm-800/60 mb-4">
                {actionDialog.action === 'SUSPEND' && 'This will suspend the user account. The user will not be able to access the platform.'}
                {actionDialog.action === 'BAN' && 'This will permanently ban the user account. The user will no longer be able to use the platform.'}
                {actionDialog.action === 'REACTIVATE' && 'This will restore the user account to active status.'}
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
                <Button onClick={executeUserAction} disabled={!!actionLoading}>
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
