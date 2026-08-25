'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Star, Send } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { api } from '../../../lib/api'

function NewReviewForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  const shopId = searchParams.get('shopId')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await api.post('/reviews', {
        rating,
        comment,
        productId: productId || undefined,
        shopId: shopId || undefined,
      })

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          router.back()
        }, 1500)
      } else {
        setError(response.error || 'Failed to submit review')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
          <ArrowLeft size={20} className="text-warm-800" />
        </button>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Write a Review
          </h1>
          <p className="text-warm-800/60">Share your experience</p>
        </div>
      </div>

      {success && (
        <Card className="p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Send size={24} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-warm-900 mb-1">Review Submitted!</h3>
          <p className="text-sm text-warm-800/60">Thank you for your feedback.</p>
        </Card>
      )}

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-warm-900 mb-3">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-warm-300'
                    }
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-warm-800/60">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-900 mb-3">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
              required
              rows={5}
              className="w-full bg-warm-50 border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <Button fullWidth type="submit" disabled={submitting || rating === 0}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function NewReviewPage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading...</p>
          </div>
        </div>
      }>
        <NewReviewForm />
      </Suspense>
      <BottomNav />
    </div>
  )
}
