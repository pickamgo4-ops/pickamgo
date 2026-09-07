'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Flame, Sparkles, Tag, Search, Wrench } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { ProductCard } from '../components/product/ProductCard'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { api } from '../lib/api'
import { getShopUrl } from '../lib/shop-url'
import { Product, Shop } from '../types'
import { mapApiProductToFrontend, mapApiShopToFrontend } from '../lib/api-mappers'
import { mapApiCategoryToFrontend } from '../lib/api-mappers'
import { CategoryGrid } from '../components/layout/CategoryGrid'
import { Category } from '../types'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const GoogleLocationPicker = dynamic(() => import('../components/map/GoogleLocationPicker'), { ssr: false })

export default function HomePage() {
  const router = useRouter()
  const [location, setLocation] = useState('Choose an area (optional)')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const generationRef = useRef(0)

  const locations = ['Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast']

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pickamgo-location') || 'null')
      if (saved?.latitude != null && saved?.longitude != null) {
        setCoordinates({ latitude: saved.latitude, longitude: saved.longitude })
        setLocation(saved.address || 'Near you')
      }
    } catch {
      localStorage.removeItem('pickamgo-location')
    }
  }, [])

  const loadData = async () => {
    const currentGeneration = ++generationRef.current
    setLoading(true)
    setLoadError(null)
    try {
      const publicSettings = await api.get<{ maintenanceMode: boolean; platformName: string }>('/admin/settings/public')
      if (publicSettings.success && publicSettings.data) {
        setMaintenanceMode(Boolean(publicSettings.data.maintenanceMode))
      }

      const results = await Promise.allSettled([
        api.get<{ products: any[] }>(`/products?limit=20${coordinates ? `&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=25` : locationQuery ? `&location=${encodeURIComponent(locationQuery)}` : ''}`),
        api.get<{ shops: any[] }>(`/shops?limit=6${coordinates ? `&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=5` : ''}`),
        api.get<any[]>('/categories'),
      ])

      if (currentGeneration !== generationRef.current) return

      const [productsRes, shopsRes, categoriesRes] = results

      if (productsRes.status === 'fulfilled' && productsRes.value.success && productsRes.value.data) {
        setProducts((productsRes.value.data.products || []).map(mapApiProductToFrontend))
      } else if (productsRes.status === 'rejected') {
        console.error('Products API error:', productsRes.reason)
        setLoadError('Unable to load products. Please try again.')
      } else if (!productsRes.value.success) {
        setLoadError(productsRes.value.error || 'Unable to load products. Please try again.')
      }

      if (shopsRes.status === 'fulfilled' && shopsRes.value.success && shopsRes.value.data) {
        setShops((shopsRes.value.data.shops || []).map(mapApiShopToFrontend))
      } else if (shopsRes.status === 'rejected') {
        console.error('Shops API error:', shopsRes.reason)
      }

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.success && Array.isArray(categoriesRes.value.data)) {
        setCategories(categoriesRes.value.data.map(mapApiCategoryToFrontend))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setLoadError('Something went wrong. Please try again.')
    } finally {
      if (currentGeneration === generationRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadData()
    return () => {
      generationRef.current += 1
    }
  }, [coordinates, locationQuery])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(position => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      setCoordinates(next)
      setLocation('Your current location')
      localStorage.setItem('pickamgo-location', JSON.stringify({ ...next, address: 'Your current location' }))
      setIsLocationOpen(false)
    }, () => setLocation('Location unavailable - browse all'))
  }

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    if (searchQuery.trim()) router.push(`/discover?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  const trendingProducts = products.filter(p => p.isTrending)
  const newProducts = products.filter(p => p.isNew)
  const nearbyProducts = coordinates ? products.slice(0, 4) : []

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
        <Card className="max-w-xl w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Wrench className="text-primary" size={28} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">Maintenance</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-warm-900 mb-4">We&apos;ll be back soon</h1>
          <p className="text-base md:text-lg text-warm-800/70 leading-relaxed">
            PickAmGo is currently undergoing maintenance. We&apos;re making some improvements and will be back shortly.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="pt-8 pb-10 md:pt-14 md:pb-16">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-primary/5 border border-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary mb-4">
              PickAmGo
            </span>
            <h1 className="font-display text-3xl font-bold leading-tight text-warm-900 sm:text-5xl">
              Where every pick <span className="text-primary">finds you</span>
            </h1>
            <p className="mt-3 text-base text-warm-800/70 sm:text-lg max-w-xl">
              Discover products, food, fashion, services, and trusted local businesses near you.
            </p>

            {/* Location */}
            <div className="relative mt-6 max-w-md">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-warm-800/50">
                Set your area
              </label>
              <button
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="flex w-full items-center gap-3 rounded-xl border border-warm-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40"
              >
                <MapPin size={20} className="text-primary" />
                <span className="min-w-0 flex-1 truncate font-medium text-warm-900">{location}</span>
                <ChevronDown size={18} className="text-warm-800/40 ml-auto" />
              </button>

              {isLocationOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-warm-200 p-3 z-20">
                  <button onClick={useCurrentLocation} className="w-full text-left px-3 py-2.5 text-primary font-medium hover:bg-warm-100 rounded-lg">
                    Use my current location
                  </button>
                  <GoogleLocationPicker
                    value={coordinates ? { address: location, ...coordinates } : null}
                    onChange={(result) => {
                      const next = { latitude: result.latitude, longitude: result.longitude }
                      setCoordinates(next)
                      setLocation(result.address)
                      localStorage.setItem('pickamgo-location', JSON.stringify({ ...next, address: result.address }))
                      setIsLocationOpen(false)
                    }}
                    placeholder="Search a neighborhood, town, or city"
                    height="180px"
                  />
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocation(loc)
                        setCoordinates(null)
                        setLocationQuery(loc)
                        setIsLocationOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-warm-100 transition-colors rounded-lg ${
                        location === loc ? 'bg-warm-100 text-primary font-medium' : 'text-warm-900'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative mt-4 max-w-md">
              <input
                type="text"
                placeholder="Search products, shops, or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-warm-200 rounded-xl py-3 pl-11 pr-4 text-sm text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-800/40" />
            </form>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-warm-800/60">Loading...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="text-center py-16">
            <p className="text-warm-800/60">{loadError}</p>
            <Button className="mt-4" onClick={loadData}>Try Again</Button>
          </div>
        ) : (
          <>
            {categories.length > 0 && (
              <section className="mb-10">
                <SectionHeader title="Categories" subtitle="Browse by category" link="/categories" />
                <CategoryGrid
                  categories={categories.slice(0, 8)}
                  onSelect={(category) => router.push(`/discover?category=${encodeURIComponent(category)}`)}
                />
              </section>
            )}

            {nearbyProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Near you"
                  subtitle={location}
                  link="/discover"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nearbyProducts.map(product => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {trendingProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Trending"
                  emoji={<Flame size={18} className="text-orange-500" />}
                  subtitle="Popular picks right now"
                  link="/discover?filter=trending"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {newProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="New arrivals"
                  emoji={<Sparkles size={18} className="text-blue-500" />}
                  subtitle="Fresh finds just added"
                  link="/discover?filter=new"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {newProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {shops.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Shops nearby"
                  subtitle="Local sellers and businesses"
                  link="/discover?type=shops"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shops.map((shop) => (
                    <Card
                      key={shop.id}
                      className="overflow-hidden cursor-pointer"
                      onClick={() => window.location.assign(getShopUrl(shop.slug))}
                    >
                      <div className="h-28 bg-warm-100 relative overflow-hidden">
                        {shop.banner && (
                          <img src={shop.banner} alt={shop.name} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute -bottom-7 left-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border-4 border-white shadow-md bg-white">
                            <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-9 px-4 pb-4">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-bold text-warm-900">{shop.name}</h3>
                          {shop.isVerified && <span className="text-emerald-500">✓</span>}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-warm-800/60 mb-2">
                          <MapPin size={14} />
                          <span>{shop.distance} away</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-sm">★</span>
                            <span className="text-sm font-semibold">{shop.rating}</span>
                            <span className="text-xs text-warm-800/50">({shop.reviews})</span>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            shop.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {shop.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="h-8 md:h-0" />
      </main>

      <BottomNav />
    </div>
  )
}
