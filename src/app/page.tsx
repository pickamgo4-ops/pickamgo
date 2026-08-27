'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Flame, Sparkles, Tag, Star, Eye, CheckCircle2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { ProductCard } from '../components/product/ProductCard'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { getShopUrl } from '../lib/shop-url'
import { Product, Shop } from '../types'
import { mapApiProductToFrontend, mapApiShopToFrontend } from '../lib/api-mappers'
import { useRouter } from 'next/navigation'
import MapboxLocationPicker from '../components/map/MapboxLocationPicker'

export default function HomePage() {
  const router = useRouter()
  const [location, setLocation] = useState('Choose an area (optional)')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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
      const results = await Promise.allSettled([
        api.get<{ products: any[] }>(`/products?limit=20${coordinates ? `&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=25` : locationQuery ? `&location=${encodeURIComponent(locationQuery)}` : ''}`),
        api.get<{ shops: any[] }>(`/shops?limit=6${coordinates ? `&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=5` : ''}`),
      ])

      if (currentGeneration !== generationRef.current) return

      const [productsRes, shopsRes] = results

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
  const affordableProducts = products.filter(p => p.price < 50)
  const nearbyProducts = coordinates ? products.slice(0, 4) : []

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="py-8 md:py-12">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-warm-900 leading-tight mb-4">
              Find something good{' '}
              <span className="text-primary">near you</span>{' '}
              <Eye size={28} className="inline-block text-warm-800/70" />
            </h1>
            <p className="text-lg md:text-xl text-warm-800/70 mb-6 text-balance">
              Discover products, beauty, food, fashion and businesses around you.
            </p>

            {/* Location Selector */}
            <div className="relative mb-6">
              <button
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="flex items-center gap-2 bg-white border border-warm-200 rounded-xl px-4 py-3 shadow-sm hover:border-primary/30 transition-colors"
              >
                <MapPin size={20} className="text-primary" />
                <span className="font-medium text-warm-900">{location}</span>
                <ChevronDown size={18} className="text-warm-800/50 ml-auto" />
              </button>

              {isLocationOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-warm-200 p-3 z-20 animate-fade-in">
                  <button onClick={useCurrentLocation} className="w-full text-left px-3 py-2.5 text-primary font-medium hover:bg-warm-100 rounded-lg">Use my current location</button>
                  <MapboxLocationPicker
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
                      className={`w-full text-left px-4 py-2.5 hover:bg-warm-100 transition-colors ${
                        location === loc ? 'bg-warm-100 text-primary font-medium' : 'text-warm-900'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search beauty, food, sneakers, phones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-warm-200 rounded-2xl py-4 pl-14 pr-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
              />
              <MapPin size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-warm-800/40" />
            </form>
          </div>
        </section>

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
            <Button className="mt-4" onClick={() => loadData()}>Try Again</Button>
          </div>
        ) : (
          <>
            {nearbyProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader title="Products Near You" emoji={<MapPin size={20} className="text-primary" />} subtitle={`Closest finds around ${location}`} link="/discover" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nearbyProducts.map(product => <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />)}
                </div>
              </section>
            )}
            {/* Trending Near You */}
            {trendingProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Trending Near You"
                  emoji={<Flame size={20} className="text-orange-500" />}
                  subtitle="Popular picks in your area"
                  link="/discover?filter=trending"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Just Dropped */}
            {newProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Just Dropped"
                  emoji={<Sparkles size={20} className="text-blue-500" />}
                  subtitle="Fresh finds just landed"
                  link="/discover?filter=new"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {newProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Under GH₵50 */}
            {affordableProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Under GH₵50"
                  emoji={<Tag size={20} className="text-green-500" />}
                  subtitle="Affordable finds you'll love"
                  link="/discover?filter=under50"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {affordableProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Shops Near You */}
            {shops.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Shops Near You"
                  emoji={<MapPin size={20} className="text-primary" />}
                  subtitle="Local sellers and businesses"
                  link="/discover?type=shops"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shops.map((shop) => (
                    <div
                      key={shop.id}
                      className="bg-white rounded-2xl overflow-hidden border border-warm-200/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => window.location.assign(getShopUrl(shop.slug))}
                    >
                      <div className="h-24 bg-gradient-to-r from-primary/20 to-secondary/20 relative">
                        {shop.banner && (
                          <img
                            src={shop.banner}
                            alt={shop.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute -bottom-8 left-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-warm-100">
                            <img
                              src={shop.logo}
                              alt={shop.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="pt-10 px-4 pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-warm-900">{shop.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-warm-800/60 mt-0.5">
                              <MapPin size={14} />
                              <span>{shop.distance} away</span>
                            </div>
                          </div>
                          {shop.isVerified && (
                            <CheckCircle2 size={20} className="text-emerald-500" />
                          )}
                        </div>
                        <p className="text-sm text-warm-800/60 line-clamp-2 mb-3">
                          {shop.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star size={16} className="fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-sm">{shop.rating}</span>
                            <span className="text-sm text-warm-800/50">({shop.reviews})</span>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            shop.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {shop.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Spacer for bottom nav on mobile */}
        <div className="h-8 md:h-0" />
      </main>

      <BottomNav />
    </div>
  )
}
