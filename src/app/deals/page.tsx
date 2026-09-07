'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ProductCard } from '../../components/product/ProductCard'
import { api } from '../../lib/api'
import { Product } from '../../types'
import { mapApiProductToFrontend } from '../../lib/api-mappers'
import { Zap, Tag, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDeals()
  }, [])

  const loadDeals = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<{ products: any[] }>('/deals?limit=40')
      if (response.success && response.data) {
        setDeals((response.data.products || []).map(mapApiProductToFrontend))
      } else {
        setError(response.error || 'Failed to load deals')
      }
    } catch (err) {
      console.error('Failed to load deals:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-warm-800/60">Loading deals...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
            <Zap size={24} className="text-orange-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Deals</h1>
            <p className="text-warm-800/60">Limited-time offers and flash sales</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <Button className="mt-3" variant="ghost" onClick={loadDeals}>Try Again</Button>
          </div>
        )}

        {!error && deals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">No deals right now</h2>
            <p className="text-warm-800/60 mb-6 max-w-md mx-auto">
              Check back soon for limited-time offers and flash sales.
            </p>
            <Button onClick={() => router.push('/discover')}>Browse Products</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {deals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
