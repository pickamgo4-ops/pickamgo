'use client'

import React, { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { ProductCard } from '../../components/product/ProductCard'
import { BeautyCard } from '../../components/beauty/BeautyCard'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { Product, BeautyService } from '../../types'
import { mapApiProductToFrontend, mapApiServiceToFrontend } from '../../lib/api-mappers'
import { useRouter } from 'next/navigation'

export default function FavoritesPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<BeautyService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setLoading(true)
    try {
      const [productsRes, servicesRes] = await Promise.all([
        api.get<{ products: any[] }>('/products?limit=50'),
        api.get<{ services: any[] }>('/services?limit=50'),
      ])

      if (productsRes.success && productsRes.data) {
        const allProducts = (productsRes.data.products || []).map(mapApiProductToFrontend)
        const favorites = allProducts.filter(p => p.isFavorite)
        setProducts(favorites)
      }

      if (servicesRes.success && servicesRes.data) {
        const allServices = (servicesRes.data.services || []).map(mapApiServiceToFrontend)
        const favorites = allServices.filter(s => s.isFavorite)
        setServices(favorites)
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  const favoriteProducts = products.filter(p => p.isFavorite)
  const favoriteServices = services.filter(s => s.isFavorite)
  const totalFavorites = favoriteProducts.length + favoriteServices.length

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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading favorites...</p>
            </div>
          </div>
        ) : totalFavorites === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              Your favorites are waiting ❤️
            </h2>
            <p className="text-warm-800/60 mb-6 max-w-md mx-auto">
              Save items you love by tapping the heart icon. They&apos;ll appear here for easy access.
            </p>
            <Button onClick={() => window.location.href = '/discover'}>Start Browsing</Button>
          </div>
        ) : (
          <>
            {favoriteProducts.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-xl font-bold text-warm-900 mb-4">
                  Products
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
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
                  {favoriteServices.map((service) => (
                    <BeautyCard key={service.id} service={service} />
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
