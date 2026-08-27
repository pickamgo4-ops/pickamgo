'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Shield, Eye, Loader2, XCircle, CheckCircle, X, FileText } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'
import { useRole } from '../../../contexts/RoleContext'

interface AdminVerification {
  id: string
  userId: string
  shopId?: string
  status: string
  idType: string
  idNumber: string
  idDocumentUrl: string
  businessName?: string
  businessType?: string
  rejectionReason?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  user: { id: string; name: string; email: string }
}

export default function AdminVerificationsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifications, setVerifications] = useState<AdminVerification[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedVerification, setSelectedVerification] = useState<AdminVerification | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadVerifications()
  }, [authInitialized, user, page, statusFilter, typeFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadVerifications(1, searchQuery, statusFilter, typeFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadVerifications = async (pageNum = page, search = searchQuery, status = statusFilter, type = typeFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (type) params.set('type', type)

      const response = await api.get<any>(`/admin/verifications?${params.toString()}`)
      if (response.success && response.data) {
        setVerifications(response.data.verifications || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load verifications')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const handleApprove = async (ver: AdminVerification) => {
    if (!window.confirm(`Approve verification for ${ver.user.name}?`)) return

    setUpdating(true)
    try {
      const response = await api.patch(`/admin/verifications/${ver.id}`, { status: 'APPROVED' })
      if (response.success) {
        setVerifications(prev => prev.filter(v => v.id !== ver.id))
        setSelectedVerification(null)
      }
    } catch {
      console.error('Failed to approve verification')
    } finally {
      setUpdating(false)
    }
  }

  const handleReject = async (ver: AdminVerification) => {
    if (!window.confirm(`Reject verification for ${ver.user.name}?`)) return
    const reason = prompt('Rejection reason (optional):') || ''
    if (reason === null) return

    setUpdating(true)
    try {
      const response = await api.patch(`/admin/verifications/${ver.id}`, { status: 'REJECTED', rejectionReason: reason })
      if (response.success) {
        setVerifications(prev => prev.filter(v => v.id !== ver.id))
        setSelectedVerification(null)
      }
    } catch {
      console.error('Failed to reject verification')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'delivery', label: 'Pending' },
      APPROVED: { variant: 'verified', label: 'Approved' },
      REJECTED: { variant: 'default', label: 'Rejected' },
      SUSPENDED: { variant: 'default', label: 'Suspended' },
    }
    const c = config[status] || { variant: 'default', label: status }
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
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Verifications
            </h1>
            <p className="text-warm-800/60 text-sm">Review seller and rider verifications</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
            <Input
              placeholder="Search by user name or email..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
          >
            <option value="">All types</option>
            <option value="SELLER">Seller</option>
            <option value="RIDER">Rider</option>
          </select>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-warm-800/60">Loading verifications...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <XCircle size={44} className="mx-auto text-red-500 mb-3" />
            <p className="text-warm-900 font-medium">{error}</p>
            <Button onClick={() => loadVerifications()} className="mt-4">Retry</Button>
          </Card>
        ) : verifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield size={44} className="mx-auto text-warm-800/30 mb-3" />
            <p className="text-warm-800/60">No verifications found</p>
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
                      <th className="px-4 py-3 font-semibold text-warm-800/70">ID</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Business</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {verifications.map((v) => (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedVerification(v)}
                        className="hover:bg-warm-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-warm-900">{v.user.name}</p>
                            <p className="text-xs text-warm-800/50">{v.user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={v.idType === 'NIN' || v.idType === 'PASSPORT' ? 'new' : 'default'}>
                            {v.idType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-warm-800/70">{v.idNumber}</td>
                        <td className="px-4 py-3 text-warm-800/70">
                          {v.businessName || '-'}
                          {v.businessType && <span className="text-xs text-warm-800/50"> ({v.businessType})</span>}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                        <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                          {new Date(v.createdAt).toLocaleDateString()}
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
      </main>

      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setSelectedVerification(null); setRejectionReason('') }}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-warm-900">Verification Details</h2>
              <button onClick={() => { setSelectedVerification(null); setRejectionReason('') }} className="p-2 rounded-xl hover:bg-warm-100">
                <X size={20} className="text-warm-800" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">User</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.user.name}</p>
                  <p className="text-xs text-warm-800/60">{selectedVerification.user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Type</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.idType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">ID Number</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.idNumber}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                </div>
              </div>

              {selectedVerification.businessName && (
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Business</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.businessName}</p>
                  <p className="text-xs text-warm-800/60">{selectedVerification.businessType}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">ID Document</label>
                <a
                  href={selectedVerification.idDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <FileText size={14} />
                  View Document
                </a>
              </div>

              {selectedVerification.rejectionReason && (
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Rejection Reason</label>
                  <p className="text-sm text-red-600 mt-1">{selectedVerification.rejectionReason}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-warm-800/50 uppercase">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(selectedVerification)}
                    disabled={updating || selectedVerification.status === 'APPROVED'}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(selectedVerification)}
                    disabled={updating || selectedVerification.status === 'REJECTED'}
                  >
                    <XCircle size={16} />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
