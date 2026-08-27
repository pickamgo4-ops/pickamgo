'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Flag, MessageSquare, Search, Filter, Eye, CheckCircle, XCircle, Clock, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface Report {
  id: string
  category: string
  targetType: string
  targetId: string
  reason: string
  description?: string
  attachmentUrl?: string
  status: string
  adminNotes?: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  reporter: { id: string; name: string; email: string }
}

export default function AdminReportsPage() {
  const router = useRouter()
  const { user } = useRole()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadReports()
  }, [page, statusFilter, categoryFilter])

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)

      const response = await api.get<any>(`/reports?${params.toString()}`)
      if (response.success && response.data) {
        setReports(response.data.reports || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
      }
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (reportId: string, status: string) => {
    setUpdating(true)
    try {
      const response = await api.patch(`/reports/${reportId}/status`, { status, adminNotes })
      if (response.success) {
        setSelectedReport(null)
        setAdminNotes('')
        loadReports()
      }
    } catch (err) {
      console.error('Failed to update report:', err)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      NEW: { variant: 'default', label: 'New' },
      REVIEWING: { variant: 'deal', label: 'Reviewing' },
      RESOLVED: { variant: 'verified', label: 'Resolved' },
      DISMISSED: { variant: 'default', label: 'Dismissed' },
    }
    const c = config[status] || config.NEW
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Reports / Analytics
          </h1>
          <p className="text-warm-800/60 text-sm">Manage and review user reports</p>
        </div>
      </div>

      {selectedReport ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedReport(null)} className="p-2 rounded-xl hover:bg-warm-100">
                <ChevronLeft size={20} className="text-warm-800" />
              </button>
              <div>
                <h2 className="font-display text-xl font-bold text-warm-900">Report Details</h2>
                <p className="text-sm text-warm-800/60">ID: {selectedReport.id}</p>
              </div>
            </div>
            {getStatusBadge(selectedReport.status)}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Category</label>
                <p className="text-sm font-medium text-warm-900 mt-1">{selectedReport.category}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Target Type</label>
                <p className="text-sm font-medium text-warm-900 mt-1">{selectedReport.targetType}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Target ID</label>
                <p className="text-sm font-medium text-warm-900 mt-1">{selectedReport.targetId}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Reporter</label>
                <p className="text-sm font-medium text-warm-900 mt-1">{selectedReport.reporter.name} ({selectedReport.reporter.email})</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-warm-800/50 uppercase">Reason</label>
              <p className="text-sm text-warm-900 mt-1">{selectedReport.reason}</p>
            </div>

            {selectedReport.description && (
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Description</label>
                <p className="text-sm text-warm-900 mt-1">{selectedReport.description}</p>
              </div>
            )}

            {selectedReport.attachmentUrl && (
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Attachment</label>
                <div className="mt-2 w-40 h-40 rounded-xl overflow-hidden bg-warm-200 border border-warm-200">
                  <img src={selectedReport.attachmentUrl} alt="Attachment" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {selectedReport.adminNotes && (
              <div>
                <label className="text-xs font-medium text-warm-800/50 uppercase">Admin Notes</label>
                <p className="text-sm text-warm-900 mt-1">{selectedReport.adminNotes}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-warm-800/50 uppercase">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
                className="mt-2 w-full rounded-xl border border-warm-200 p-3 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => updateStatus(selectedReport.id, 'REVIEWING')} disabled={updating || selectedReport.status === 'REVIEWING'}>
                <Clock size={16} />
                Mark Reviewing
              </Button>
              <Button onClick={() => updateStatus(selectedReport.id, 'RESOLVED')} disabled={updating || selectedReport.status === 'RESOLVED'}>
                <CheckCircle size={16} />
                Resolve
              </Button>
              <Button variant="outline" onClick={() => updateStatus(selectedReport.id, 'DISMISSED')} disabled={updating || selectedReport.status === 'DISMISSED'}>
                <XCircle size={16} />
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm"
            >
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="REVIEWING">Reviewing</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm"
            >
              <option value="">All categories</option>
              <option value="FRAUD">Fraud</option>
              <option value="PAYMENT_ISSUE">Payment issue</option>
              <option value="WRONG_PRODUCT">Wrong product</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="FAKE_SHOP">Fake shop</option>
              <option value="ORDER_PROBLEM">Order problem</option>
              <option value="DELIVERY_PROBLEM">Delivery problem</option>
              <option value="SUSPICIOUS_ACTIVITY">Suspicious activity</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-warm-800/60">Loading reports...</p>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-12 text-center">
              <Flag size={44} className="mx-auto text-warm-800/30 mb-3" />
              <p className="text-warm-800/60">No reports found</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => { setSelectedReport(report); setAdminNotes(report.adminNotes || '') }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-warm-900">{report.category}</span>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-sm text-warm-800/70 line-clamp-1">{report.reason}</p>
                      <p className="text-xs text-warm-800/50 mt-1">
                        {report.targetType} • {report.targetId} • {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Eye size={16} className="text-warm-800/50 flex-shrink-0 ml-2" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
