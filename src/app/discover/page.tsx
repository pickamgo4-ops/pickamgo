'use client'

import React, { Suspense, useState, useEffect, useRef } from 'react'
import { Search, SlidersHorizontal, MapPin, X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { ProductCard } from '../../components/product/ProductCard'
import { BeautyCard } from '../../components/beauty/BeautyCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { Product, BeautyService, Category } from '../../types'
import { mapApiProductToFrontend, mapApiServiceToFrontend, mapApiCategoryToFrontend } from '../../lib/api-mappers'
import { useRouter, useSearchParams } from 'next/navigation'

function DiscoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState([0, 500])
  const [selectedDistance, setSelectedDistance] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [showServices, setShowServices] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<BeautyService[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const renderCategoryIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName]
    if (IconComponent) {
      return <IconComponent size={18} />
    }
    return <LucideIcons.PackageOpen size={18} />
  }
  const generationRef = useRef(0)

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'distance', label: 'Nearest' },
    { value: 'newest', label: 'Newest' },
  ]

  const distanceOptions = [
    { value: 'all', label: 'All distances' },
    { value: '1km', label: 'Under 1 km' },
    { value: '3km', label: 'Under 3 km' },
    { value: '5km', label: 'Under 5 km' },
    { value: '10km', label: 'Under 10 km' },
  ]

  useEffect(() => {
    const initialSearch = searchParams.get('search') || ''
    const initialCategory = searchParams.get('category') || null
    setSearchQuery(initialSearch)
    setSelectedCategory(initialCategory)
    loadData(initialSearch, initialCategory)
    return () => {
      generationRef.current += 1
    }
  }, [searchParams])

  const loadData = async (requestedSearch = searchQuery, requestedCategory = selectedCategory) => {
    const currentGeneration = ++generationRef.current
    setLoading(true)
    setLoadError(null)
    try {
      const savedLocation = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pickamgo-location') || 'null') : null
      const params = new URLSearchParams({ q: requestedSearch || (requestedCategory || 'products'), type: 'products', limit: '50' })
      if (requestedCategory) params.set('category', requestedCategory)
      if (savedLocation?.latitude != null && savedLocation?.longitude != null) {
        params.set('latitude', String(savedLocation.latitude))
        params.set('longitude', String(savedLocation.longitude))
        params.set('radius', '25')
      }
      const [productsRes, servicesRes, categoriesRes] = await Promise.all([
        requestedSearch || requestedCategory
          ? api.get<any>(`/search?${params.toString()}`)
          : api.get<{ products: any[] }>('/products?limit=50'),
        api.get<{ services: any[] }>('/services?limit=50'),
        api.get<any[]>('/categories'),
      ])

      if (currentGeneration !== generationRef.current) return

      if (productsRes.success && productsRes.data) {
        const rawProducts = requestedSearch || requestedCategory ? productsRes.data.products?.items || [] : productsRes.data.products || []
        const mapped = rawProducts.map(mapApiProductToFrontend)
        setProducts(mapped)
      } else if (!productsRes.success) {
        setLoadError(productsRes.error || 'Unable to load products. Please try again.')
      }

      if (servicesRes.success && servicesRes.data) {
        const mapped = (servicesRes.data.services || []).map(mapApiServiceToFrontend)
        setServices(mapped)
      }

      if (categoriesRes.success && Array.isArray(categoriesRes.data)) {
        setCategories(categoriesRes.data.map(mapApiCategoryToFrontend))
      }
    } catch (err) {
      console.error('Failed to load discover data:', err)
      setLoadError('Something went wrong. Please try again.')
    } finally {
      if (currentGeneration === generationRef.current) {
        setLoading(false)
      }
    }
  }

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category !== selectedCategory) return false
    if (priceRange[1] > 0 && p.price > priceRange[1]) return false
    return true
  })

  const filteredServices = services.filter(s => {
    if (selectedCategory && s.category !== selectedCategory) return false
    return true
  })

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Section */}
        <section className="py-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-4">
            Discover
          </h1>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search beauty, food, sneakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-warm-200 rounded-xl py-3.5 pl-12 pr-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
              />
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-800/40" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3.5 rounded-xl border transition-colors ${
                showFilters ? 'bg-primary text-white border-primary' : 'bg-white border-warm-200 hover:border-primary/30'
              }`}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-2xl p-4 border border-warm-200 shadow-sm mb-4 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-warm-800/50 hover:text-warm-900"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-warm-900 mb-2 block">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-200 rounded-xl py-2.5 px-3 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-warm-900 mb-2 block">Distance</label>
                  <select
                    value={selectedDistance}
                    onChange={(e) => setSelectedDistance(e.target.value)}
                    className="w-full bg-warm-50 border border-warm-200 rounded-xl py-2.5 px-3 text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {distanceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-warm-900 mb-2 block">
                    Price: GH₵{priceRange[0]} - GH₵{priceRange[1]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="primary" size="sm" fullWidth onClick={loadData}>
                  Apply Filters
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPriceRange([0, 500])
                    setSelectedDistance('all')
                    setSortBy('relevance')
                    setSelectedCategory(null)
                    setSearchQuery('')
                    loadData()
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-white'
                  : 'bg-white border border-warm-200 text-warm-900 hover:border-primary/30'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-primary text-white'
                    : 'bg-white border border-warm-200 text-warm-900 hover:border-primary/30'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {renderCategoryIcon(category.icon)} {category.name}
                </span>
              </button>
            ))}
          </div>

          {/* Toggle Services/Products */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowServices(false)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                !showServices ? 'bg-primary text-white' : 'bg-white border border-warm-200 text-warm-900'
              }`}
            >
              Products ({filteredProducts.length})
            </button>
            <button
              onClick={() => setShowServices(true)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showServices ? 'bg-primary text-white' : 'bg-white border border-warm-200 text-warm-900'
              }`}
            >
              Services ({filteredServices.length})
            </button>
          </div>
        </section>

        {/* Results */}
        <section className="mb-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-warm-800/60">Loading...</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="text-center py-16">
              <p className="text-warm-800/60 text-lg">{loadError}</p>
              <Button className="mt-4" onClick={() => loadData(searchQuery, selectedCategory)}>Try Again</Button>
            </div>
          ) : !showServices ? (
            <>
              <SectionHeader
                title={`${filteredProducts.length} results`}
                subtitle={selectedCategory ? `in ${selectedCategory}` : 'All categories'}
              />
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-warm-800/60 text-lg">No products found</p>
                  <p className="text-sm text-warm-800/50 mt-2">Try adjusting your filters or search query</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <SectionHeader
                title={`${filteredServices.length} services`}
                subtitle="Beauty professionals near you"
              />
              {filteredServices.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-warm-800/60 text-lg">No services found</p>
                  <p className="text-sm text-warm-800/50 mt-2">Try adjusting your filters or search query</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((service) => (
                    <BeautyCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Spacer for bottom nav on mobile */}
        <div className="h-8 md:h-0" />
      </main>

      <BottomNav />
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DiscoverContent />
    </Suspense>
  )
}
