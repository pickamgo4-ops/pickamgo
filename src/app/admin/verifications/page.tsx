'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Shield, Loader2, XCircle, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminVerification {
  id: string
  userId: string
  status: string
  type?: string
  sellerType?: string
  businessName?: string
  businessDescription?: string
  businessType?: string
  businessReg?: string
  location?: string
  intendedSell?: string
  agreedToTerms?: boolean
  agreedAt?: string
  idType?: string
  idNumber?: string
  idFrontUrl?: string
  idBackUrl?: string
  selfieUrl?: string
  businessNameField?: string
  businessTypeField?: string
  rejectionReason?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewStatus?: string
  verificationMethod?: string
  verificationProvider?: string
  verificationReference?: string
  verificationDate?: string
  createdAt: string
  user: { id: string; name: string; email: string; phone?: string; avatar?: string; location?: string }
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
  const [sellerDetails, setSellerDetails] = useState<any>(null)
  const loadingRef = useRef(false)

  const loadVerifications = useCallback(async (pageNum: number, search: string, status: string, type: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
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
        const data = response.data
        const list = Array.isArray(data) ? data : data.verifications || []
        const pagination = data.pagination || { page: pageNum, limit: 20, total: list.length, totalPages: 1 }
        setVerifications(list)
        setTotalPages(pagination.totalPages || 1)
        setTotal(pagination.total || list.length)
      } else {
        setError(response.error || 'Failed to load verifications')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
      loadingRef.current = false
    }
  }, [])

  const loadSellerDetails = useCallback(async (userId: string) => {
    try {
      const response = await api.get<any>(`/admin/sellers/${userId}`)
      if (response.success && response.data) {
        setSellerDetails(response.data)
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadVerifications(page, searchQuery, statusFilter, typeFilter)
  }, [authInitialized, user, page, searchQuery, statusFilter, typeFilter, loadVerifications, router])

  useEffect(() => {
    if (selectedVerification?.userId) {
      loadSellerDetails(selectedVerification.userId)
    }
  }, [selectedVerification, loadSellerDetails])

  const handleApprove = async (ver: AdminVerification) => {
    if (!window.confirm(`Approve verification for ${ver.user.name}?`)) return

    setUpdating(true)
    try {
      const response = await api.patch(`/admin/verifications/${ver.id}/status`, { status: 'APPROVED', reviewStatus: 'NEEDS_REVIEW' })
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
    const prompted = prompt('Rejection reason (optional):') || ''
    if (prompted === null) return

    setUpdating(true)
    try {
      const response = await api.patch(`/admin/verifications/${ver.id}/status`, { status: 'REJECTED', rejectionReason: prompted.trim() || undefined })
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

  const handleSuspend = async (ver: AdminVerification) => {
    const reason = prompt('Suspension reason (required):') || ''
    if (!reason) return

    setUpdating(true)
    try {
      const response = await api.patch(`/admin/verifications/${ver.id}/status`, { status: 'SUSPENDED', rejectionReason: reason })
      if (response.success) {
        setVerifications(prev => prev.filter(v => v.id !== ver.id))
        setSelectedVerification(null)
      }
    } catch {
      console.error('Failed to suspend verification')
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
          <Shield size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Verifications
          </h1>
          <p className="text-warm-800/60 text-sm">Review seller and rider verifications</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
          <Button onClick={() => loadVerifications(page, searchQuery, statusFilter, typeFilter)} className="mt-4">Retry</Button>
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
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Seller Type</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Business</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Location</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Trust</th>
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
                        <Badge variant={v.type === 'RIDER' ? 'default' : 'new'}>
                          {v.type || 'SELLER'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-warm-800/70">{v.sellerType || '-'}</td>
                      <td className="px-4 py-3 text-warm-800/70">
                        {v.businessName || '-'}
                        {v.businessType && <span className="text-xs text-warm-800/50"> ({v.businessType})</span>}
                      </td>
                      <td className="px-4 py-3 text-warm-800/60">{v.location || '-'}</td>
                      <td className="px-4 py-3">
                        {sellerDetails && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-warm-900">{sellerDetails.risk?.trustScore ?? 50}/100</span>
                            <Badge variant={sellerDetails.risk?.riskLevel === 'HIGH' ? 'default' : sellerDetails.risk?.riskLevel === 'MEDIUM' ? 'delivery' : 'verified'}>
                              {sellerDetails.risk?.riskLevel || 'NORMAL'}
                            </Badge>
                          </div>
                        )}
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

      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setSelectedVerification(null); setRejectionReason('') }}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">Verification Details</h2>
                <button onClick={() => { setSelectedVerification(null); setRejectionReason('') }} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">User</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.user.name}</p>
                    <p className="text-xs text-warm-800/60">{selectedVerification.user.email}</p>
                    {selectedVerification.user.phone && <p className="text-xs text-warm-800/60">Phone: {selectedVerification.user.phone}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Type</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.type || 'SELLER'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Seller Type</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.sellerType || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                  </div>
                </div>

                {selectedVerification.reviewStatus && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Review Status</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.reviewStatus}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Full Name</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.user.name}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Phone Number</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.user.phone || selectedVerification.user.email}</p>
                </div>

                {selectedVerification.businessName && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-warm-800/50 uppercase">Business Name</label>
                      <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.businessName}</p>
                    </div>
                    {selectedVerification.businessType && (
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Business Type</label>
                        <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.businessType}</p>
                      </div>
                    )}
                    {selectedVerification.businessReg && (
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Business Reg. Number</label>
                        <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.businessReg}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedVerification.location && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Location</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.location}</p>
                  </div>
                )}

                {selectedVerification.intendedSell && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Intended Sell</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.intendedSell}</p>
                  </div>
                )}

                {selectedVerification.businessDescription && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Business Description</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{selectedVerification.businessDescription}</p>
                  </div>
                )}

                {selectedVerification.agreedToTerms && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Agreed to Terms</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">
                      Yes{selectedVerification.agreedAt ? ` on ${new Date(selectedVerification.agreedAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                )}

                {sellerDetails && (
                  <div className="border-t border-warm-200 pt-4">
                    <h3 className="text-sm font-medium text-warm-800/50 uppercase mb-3">Trust & Risk</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Trust Score</label>
                        <p className="text-2xl font-bold text-warm-900 mt-1">{sellerDetails.risk?.trustScore ?? 50}/100</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Risk Level</label>
                        <div className="mt-1">{getStatusBadge(sellerDetails.risk?.riskLevel || 'NORMAL')}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-warm-800/50 uppercase">Payout Frozen</label>
                        <p className="text-sm font-medium text-warm-900 mt-1">{sellerDetails.payoutFreeze ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedVerification.rejectionReason && (
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Rejection Reason</label>
                    <p className="text-sm text-red-600 mt-1">{selectedVerification.rejectionReason}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-warm-800/50">
                  <span>Created: {new Date(selectedVerification.createdAt).toLocaleString()}</span>
                  {selectedVerification.reviewedAt && <span>Reviewed: {new Date(selectedVerification.reviewedAt).toLocaleString()}</span>}
                </div>

                <div className="space-y-2 border-t border-warm-200 pt-4">
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
                      onClick={() => { setRejectionReason(''); handleReject(selectedVerification) }}
                      disabled={updating || selectedVerification.status === 'REJECTED'}
                    >
                      <XCircle size={16} />
                      Reject
                    </Button>
                    {selectedVerification.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspend(selectedVerification)}
                        disabled={updating}
                      >
                        <Shield size={16} />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
