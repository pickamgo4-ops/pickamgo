'use client'

import React, { useState, useEffect } from 'react'
import { Heart, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { ProductCard } from '../../components/product/ProductCard'
import { BeautyCard } from '../../components/beauty/BeautyCard'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { useRole } from '../../contexts/RoleContext'
import { useRouter } from 'next/navigation'

interface FavoriteItem {
  id: string
  targetType: string
  targetId: string
  createdAt: string
  product?: any
  service?: any
}

export default function FavoritesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useRole()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    loadFavorites()
  }, [user, authLoading])

  const loadFavorites = async () => {
    setLoading(true)
    try {
      const res = await api.getFavorites({ limit: 50 })
      if (res.success && res.data) {
        setFavorites(res.data.favorites || [])
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (fav: FavoriteItem) => {
    setRemoving(fav.id)
    try {
      await api.removeFavorite(fav.targetType as any, fav.targetId)
      setFavorites(prev => prev.filter(f => f.id !== fav.id))
    } catch (err) {
      console.error('Failed to remove favorite:', err)
    } finally {
      setRemoving(null)
    }
  }

  const favoriteProducts = favorites.filter(f => f.targetType === 'PRODUCT' && f.product)
  const favoriteServices = favorites.filter(f => f.targetType === 'SERVICE' && f.service)
  const totalFavorites = favoriteProducts.length + favoriteServices.length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading favorites...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <Heart size={24} className="text-red-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Favorites
            </h1>
            <p className="text-warm-800/60">
              {totalFavorites} items saved
            </p>
          </div>
        </div>

        {totalFavorites === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              Your favorites are waiting
            </h2>
            <p className="text-warm-800/60 mb-6 max-w-md mx-auto">
              Save items you love by tapping the heart icon. They&apos;ll appear here for easy access.
            </p>
            <Button onClick={() => router.push('/discover')}>Start Browsing</Button>
          </div>
        ) : (
          <>
            {favoriteProducts.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-xl font-bold text-warm-900 mb-4">
                  Products
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteProducts.map((fav) => (
                    <div key={fav.id} className="relative">
                      <ProductCard
                        product={{
                          ...fav.product,
                          isFavorite: true,
                        }}
                        onClick={() => router.push(`/product/${fav.product.id}`)}
                        onFavorite={() => handleRemove(fav)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(fav)
                        }}
                        disabled={removing === fav.id}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        title="Remove from favorites"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {favoriteServices.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-xl font-bold text-warm-900 mb-4">
                  Beauty Services
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteServices.map((fav) => (
                    <div key={fav.id} className="relative">
                      <BeautyCard
                        service={{
                          ...fav.service,
                          isFavorite: true,
                        }}
                        onClick={() => router.push(`/service/${fav.service.id}`)}
                        onFavorite={() => handleRemove(fav)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(fav)
                        }}
                        disabled={removing === fav.id}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        title="Remove from favorites"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
