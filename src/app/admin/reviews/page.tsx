'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Star, Eye, Loader2, XCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminReview {
  id: string
  rating: number
  comment: string
  targetType: string
  targetId: string
  createdAt: string
  user: { id: string; name: string; email: string; avatar: string }
}

export default function AdminReviewsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadReviews()
  }, [authInitialized, user, page, targetTypeFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1)
        loadReviews(1, searchQuery, targetTypeFilter)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const loadReviews = async (pageNum = page, search = searchQuery, targetType = targetTypeFilter) => {
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (targetType) params.set('targetType', targetType)

      const response = await api.get<any>(`/admin/reviews?${params.toString()}`)
      if (response.success && response.data) {
        setReviews(response.data.reviews || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load reviews')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
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
      <div className="min-h-screen flex items-center justify-center">
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
          <Star size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Reviews
          </h1>
          <p className="text-warm-800/60 text-sm">Review platform ratings and feedback</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
          <Input
            placeholder="Search by comment or user..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="pl-9"
          />
        </div>
        <select
          value={targetTypeFilter}
          onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-warm-200 px-3 py-3 bg-white text-sm text-warm-900"
        >
          <option value="">All types</option>
          <option value="PRODUCT">Product</option>
          <option value="SERVICE">Service</option>
          <option value="SHOP">Shop</option>
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading reviews...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadReviews()} className="mt-4">Retry</Button>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="p-12 text-center">
          <Star size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No reviews found</p>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">User</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Rating</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Comment</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70">Type</th>
                    <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {reviews.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReview(r)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-xs font-medium text-warm-800">
                            {r.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-warm-900">{r.user.name}</p>
                            <p className="text-xs text-warm-800/50">{r.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{renderStars(r.rating)}</td>
                      <td className="px-4 py-3 text-warm-800/70 hidden md:table-cell line-clamp-1">
                        {r.comment}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.targetType === 'PRODUCT' ? 'default' : r.targetType === 'SERVICE' ? 'deal' : 'verified'}>
                          {r.targetType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                        {new Date(r.createdAt).toLocaleDateString()}
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

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedReview(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-warm-900">Review Details</h2>
                <button onClick={() => setSelectedReview(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-200 flex items-center justify-center text-sm font-medium text-warm-800">
                    {selectedReview.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-warm-900">{selectedReview.user.name}</p>
                    <p className="text-xs text-warm-800/60">{selectedReview.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(selectedReview.rating)}
                  <Badge variant={selectedReview.targetType === 'PRODUCT' ? 'default' : selectedReview.targetType === 'SERVICE' ? 'deal' : 'verified'}>
                    {selectedReview.targetType}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Comment</label>
                  <p className="text-sm text-warm-900 mt-1">{selectedReview.comment}</p>
                </div>
                <div className="text-xs text-warm-800/50">
                  Created: {new Date(selectedReview.createdAt).toLocaleString()}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
