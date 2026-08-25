'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star, MessageCircle } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { Review } from '@/types'

export default function SellerReviewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const response = await api.get<{ reviews: Review[]; averageRating: number }>('/seller/reviews')
      if (response.success && response.data) {
        setReviews(response.data.reviews || [])
        setAverageRating(response.data.averageRating || 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading reviews...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Reviews</h1>
          <p className="text-warm-800/60 mt-1">What customers say about your shop</p>
        </div>

        {/* Rating Summary */}
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-warm-900">{averageRating.toFixed(1)}</p>
              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={star <= Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-warm-800/30'}
                  />
                ))}
              </div>
              <p className="text-xs text-warm-800/60 mt-1">{reviews.length} reviews</p>
            </div>
          </div>
        </Card>

        {reviews.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle size={48} className="mx-auto text-warm-800/30 mb-4" />
            <h3 className="font-semibold text-warm-900 mb-2">No reviews yet</h3>
            <p className="text-sm text-warm-800/60">Reviews from customers will appear here</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar src={review.userAvatar} fallback={review.userName?.[0]} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-warm-900">{review.userName || 'Anonymous'}</h4>
                      <span className="text-xs text-warm-800/60">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-warm-800/30'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-warm-800/80">{review.comment}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
