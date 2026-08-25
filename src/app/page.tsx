'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, ChevronDown, Heart, Flame, Sparkles, Utensils, Shirt, PackageOpen, Tag, Store, Star } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { CategoryGrid } from '../components/layout/CategoryGrid'
import { ProductCard } from '../components/product/ProductCard'
import { BeautyCard } from '../components/beauty/BeautyCard'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { Product, BeautyService, Shop, Category } from '../types'
import { mapApiProductToFrontend, mapApiServiceToFrontend, mapApiShopToFrontend, mapApiCategoryToFrontend } from '../lib/api-mappers'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [location, setLocation] = useState('Legon, Accra')
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [beautyServices, setBeautyServices] = useState<BeautyService[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const locations = [
    'Legon, Accra',
    'Madina, Accra',
    'Osu, Accra',
    'Adenta, Accra',
    'Kumasi',
    'Takoradi',
  ]

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [productsRes, servicesRes, shopsRes, categoriesRes] = await Promise.all([
          api.get<{ products: any[] }>('/products?limit=20'),
          api.get<{ services: any[] }>('/services?limit=10'),
          api.get<{ shops: any[] }>('/shops?limit=6'),
          api.get<{ data: any[] }>('/categories'),
        ])

        if (productsRes.success && productsRes.data) {
          setProducts((productsRes.data.products || []).map(mapApiProductToFrontend))
        }
        if (servicesRes.success && servicesRes.data) {
          setBeautyServices((servicesRes.data.services || []).map(mapApiServiceToFrontend))
        }
        if (shopsRes.success && shopsRes.data) {
          setShops((shopsRes.data.shops || []).map(mapApiShopToFrontend))
        }
        if (categoriesRes.success && Array.isArray(categoriesRes.data)) {
          setCategories(categoriesRes.data.map(mapApiCategoryToFrontend))
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const trendingProducts = products.filter(p => p.isTrending)
  const beautyProducts = products.filter(p => p.category === 'beauty')
  const foodProducts = products.filter(p => p.category === 'food')
  const fashionProducts = products.filter(p => p.category === 'fashion')
  const newProducts = products.filter(p => p.isNew)
  const affordableProducts = products.filter(p => p.price < 50)

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
              👀
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-warm-200 py-2 z-20 animate-fade-in">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocation(loc)
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
            <div className="relative">
              <input
                type="text"
                placeholder="Search beauty, food, sneakers, phones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-warm-200 rounded-2xl py-4 pl-14 pr-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
              />
              <MapPin size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-warm-800/40" />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-10">
          <CategoryGrid categories={categories} />
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Trending Near You */}
            {trendingProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Trending Near You"
                  emoji="🔥"
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

            {/* Beauty Near You */}
            <section className="mb-10">
              <SectionHeader
                title="Beauty Near You"
                emoji="💅🏽"
                subtitle="Products and services for your glow-up"
                link="/discover?category=beauty"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {beautyProducts.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                ))}
              </div>

              {/* Beauty Services Horizontal Scroll */}
              {beautyServices.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-lg text-warm-900 mb-3 flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    Beauty Services
                  </h3>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    {beautyServices.map((service) => (
                      <div key={service.id} className="min-w-[260px] md:min-w-[280px]">
                        <BeautyCard service={service} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Campus Cravings */}
            {foodProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Campus Cravings"
                  emoji="🍔"
                  subtitle="Food around your campus"
                  link="/discover?category=food"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {foodProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Fresh Fashion */}
            {fashionProducts.length > 0 && (
              <section className="mb-10">
                <SectionHeader
                  title="Fresh Fashion"
                  emoji="👕"
                  subtitle="Trending styles near you"
                  link="/discover?category=fashion"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fashionProducts.map((product) => (
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
                  emoji="🆕"
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
                  emoji="💸"
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
                  emoji="📍"
                  subtitle="Local sellers and businesses"
                  link="/discover?type=shops"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shops.map((shop) => (
                    <div
                      key={shop.id}
                      className="bg-white rounded-2xl overflow-hidden border border-warm-200/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
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
                            <span className="text-lg">✅</span>
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
