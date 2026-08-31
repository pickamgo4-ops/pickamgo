'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, Share2, MapPin, Star, Clock, Store, Shield, ChevronLeft, MessageCircle, Plus, Check, CheckCircle2 } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { ProductCard } from '../../../components/product/ProductCard'
import { BeautyCard } from '../../../components/beauty/BeautyCard'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { api } from '../../../lib/api'
import { Shop, Product, BeautyService } from '../../../types'
import { mapApiShopToFrontend, mapApiProductToFrontend, mapApiServiceToFrontend } from '../../../lib/api-mappers'
import { defaultShopCustomization, readableTextColor, themeClass, ShopCustomization } from '../../../lib/shop-themes'
import dynamic from 'next/dynamic'

const GoogleMap = dynamic(() => import('../../../components/map/GoogleMap'), { ssr: false })
import { useTheme } from '../../../components/theme/ThemeProvider'

export default function ShopPage() {
  const params = useParams()
  const router = useRouter()
  const { theme } = useTheme()
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followMessage, setFollowMessage] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)

  useEffect(() => {
    loadShop()
    checkFollowStatus()
  }, [params.slug])

  const loadShop = async () => {
    setLoading(true)
    try {
      const response = await api.get<Shop>(`/shops/${params.slug}`)
      if (response.success && response.data) {
        const mappedShop = mapApiShopToFrontend(response.data)
        setShop(mappedShop)

        const reviewsResponse = await api.get<{ reviews: any[]; averageRating: number; totalReviews: number }>(`/reviews/shop/${response.data.id}`)
        if (reviewsResponse.success && reviewsResponse.data) {
          setReviews(reviewsResponse.data.reviews || [])
          setAverageRating(reviewsResponse.data.averageRating || 0)
          setTotalReviews(reviewsResponse.data.totalReviews || 0)
        } else {
          setReviews([])
          setAverageRating(0)
          setTotalReviews(0)
        }
      }
    } catch (err) {
      console.error('Failed to load shop:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token || !params.slug) return
    try {
      const response = await api.get<{ isFollowing: boolean }>(`/follows/shops/${params.slug}/follow-status`)
      if (response.success && response.data) {
        setIsFollowing(response.data.isFollowing)
      }
    } catch (err) {
      console.error('Failed to check follow status:', err)
    }
  }

  const handleFollowToggle = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      router.push('/auth/login')
      return
    }

    if (!params.slug || typeof params.slug !== 'string') return

    setFollowLoading(true)
    setFollowMessage('')

    try {
      const response = await api.post(`/follows/shops/${params.slug}/follow`, {})
      if (response.success) {
        setIsFollowing(!isFollowing)
        setFollowMessage(isFollowing ? 'Unfollowed shop' : "You're now following this shop")
        setTimeout(() => setFollowMessage(''), 3000)
        loadShop()
      } else {
        setFollowMessage(response.error || 'Action failed')
      }
    } catch (err) {
      setFollowMessage('Failed to update follow status')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading shop...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-800/60 text-lg">Shop not found</p>
          <Button className="mt-4" onClick={() => router.push('/')}>Go back home</Button>
        </div>
      </div>
    )
  }

  const legacyQuickPicksId = 'CAMP' + 'US'
  const storedCustomization = (shop.customization || {}) as Partial<ShopCustomization>
  const customization = {
    ...defaultShopCustomization,
    ...storedCustomization,
    theme: storedCustomization.theme === legacyQuickPicksId ? 'QUICK_PICKS' : storedCustomization.theme || defaultShopCustomization.theme,
    layout: storedCustomization.layout === legacyQuickPicksId ? 'QUICK_PICKS' : storedCustomization.layout || defaultShopCustomization.layout,
  }
  const visibleProducts = customization.layout === 'QUICK_PICKS'
    ? shop.products.filter(product => product.isTrending || product.isNew || product.isDeal)
    : shop.products
  const featuredProduct = shop.products.find(product => product.id === customization.featuredProductId)
  const surfaceTextColor = theme === 'dark' ? '#F5F1EA' : readableTextColor(customization.secondaryColor)
  const primaryTextColor = theme === 'dark' ? '#171614' : readableTextColor(customization.primaryColor)

  return (
    <div className={`min-h-screen overflow-x-hidden pb-24 md:pb-8 ${themeClass(customization.theme)}`} style={{ '--shop-primary': customization.primaryColor, '--shop-secondary': customization.secondaryColor, '--shop-accent': customization.accentColor, color: surfaceTextColor } as React.CSSProperties}>
      {/* Banner */}
      <div className="relative h-40 sm:h-48 md:h-64 bg-[var(--shop-secondary)]">
        {(customization.coverImage || shop.banner) && (
          <img
            src={customization.coverImage || shop.banner}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start">
          <button aria-label="Go back" onClick={() => router.back()} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button aria-label="Share shop" className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
              <Share2 size={20} className="text-warm-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Shop Info */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-10">
        <div className="rounded-2xl p-4 sm:p-6 shadow-sm border border-black/10 bg-[var(--shop-secondary)]">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-warm-100 -mt-12 sm:-mt-16 flex-shrink-0">
              <img
                src={customization.logo || shop.logo}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pt-1 sm:pt-2">
              <div className="flex items-start gap-2 mb-1">
                <h1 className="font-display text-lg sm:text-xl font-bold break-words" style={{ color: surfaceTextColor }}>{shop.name}</h1>
                 {shop.isVerified && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              <div className="flex items-center gap-1 text-sm opacity-70">
                <MapPin size={14} />
                <span>{shop.distance} away · {shop.location}</span>
              </div>
            </div>
          </div>

          <p className="mb-4 opacity-75">{customization.description || shop.description}</p>

          {customization.announcement && <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium bg-[var(--shop-primary)]" style={{ color: primaryTextColor }}>{customization.announcement}</div>}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-1">
              <Star size={18} className="fill-yellow-400 text-yellow-400" />
              <span className="font-bold" style={{ color: surfaceTextColor }}>{shop.rating}</span>
              <span className="text-sm opacity-70">({shop.reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-sm opacity-70">
              <Store size={16} />
              <span>{shop.followers.toLocaleString()} followers</span>
            </div>
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-[var(--shop-primary)]" style={{ color: primaryTextColor }}>
              {shop.isOpen ? 'Open now' : 'Closed'}
            </span>
          </div>

          {/* Categories */}
          {customization.showCategories && <div className="flex flex-wrap gap-2 mb-4">
            {shop.category.map((cat) => (
              <span key={cat} className="text-xs bg-warm-100 text-warm-800 px-3 py-1.5 rounded-full font-medium">
                {cat}
              </span>
            ))}
          </div>}

          {/* Opening Hours */}
          <div className="flex items-start gap-2 text-sm text-warm-800/60 mb-4">
            <Clock size={16} />
              <span className="opacity-75">{shop.openingHours}</span>
          </div>

          {/* Delivery Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            {shop.deliveryAvailable && (
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                Platform Delivery
              </span>
            )}
            {shop.sellerDeliveryAvailable && (
              <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-medium">
                Seller Delivery
              </span>
            )}
            {shop.pickupAvailable && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
                Pickup Available
              </span>
            )}
            {shop.platformDeliveryFee !== undefined && shop.platformDeliveryFee > 0 && (
              <span className="text-xs bg-warm-100 text-warm-800 px-3 py-1.5 rounded-full font-medium">
                Delivery: GH₵{shop.platformDeliveryFee.toFixed(2)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Button
              className="col-span-2 sm:flex-1 !px-3 !py-2.5 text-sm"
              variant={isFollowing ? 'secondary' : 'primary'}
              fullWidth
              onClick={handleFollowToggle}
              disabled={followLoading}
              icon={isFollowing ? <Check size={18} /> : <Plus size={18} />}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button className="!px-2 !py-2.5 text-sm" variant="outline" fullWidth icon={<MessageCircle size={17} />} onClick={() => {
              if (!localStorage.getItem('token')) {
                router.push('/auth/login')
                return
              }
              router.push(`/messages/${shop.owner.id}`)
            }}>
              Message
            </Button>
            <Button className="!px-2 !py-2.5 text-sm" variant="ghost" fullWidth icon={<Heart size={17} />}>
              Save
            </Button>
          </div>

          {followMessage && (
            <div className={`mt-3 p-3 rounded-xl text-sm text-center ${
              followMessage.includes('now following') ? 'bg-green-50 text-green-700' : 'bg-warm-100 text-warm-800'
            }`}>
              {followMessage}
            </div>
          )}
        </div>
      </div>

      <section className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 mt-8">
        <div className="rounded-2xl p-4 sm:p-6 border border-black/10 bg-[var(--shop-secondary)]">
          <h2 className="font-display text-xl font-bold mb-1" style={{ color: surfaceTextColor }}>Find us</h2>
          <p className="text-sm opacity-75 mb-4">{shop.location}</p>
          {shop.latitude != null && shop.longitude != null ? (
            <GoogleMap
              markers={[{ latitude: shop.latitude, longitude: shop.longitude, label: `${shop.name} - ${shop.location}` }]}
              height="280px"
            />
          ) : (
            <div className="rounded-xl border border-black/10 bg-black/5 p-4 text-sm opacity-75">
              Location map unavailable. Please use the shop address above.
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      {featuredProduct && customization.showFeatured && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-10"><div className="mb-4"><h2 className="font-display text-xl font-bold" style={{ color: surfaceTextColor }}>Featured</h2><p className="text-sm opacity-70">A highlighted find from this shop</p></div><div className="max-w-sm"><ProductCard product={featuredProduct} onClick={() => router.push(`/product/${featuredProduct.id}`)} /></div></section>
      )}

      {visibleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-10">
          <SectionHeader
            title="Products"
            subtitle={`${visibleProducts.length} items available`}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => router.push(`/product/${product.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {customization.showReviews && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-10 mb-10">
          <SectionHeader
            title="Customer Reviews"
            subtitle={`${totalReviews} review${totalReviews === 1 ? '' : 's'} • ${averageRating ? averageRating.toFixed(1) : 'No ratings yet'}`}
          />

          <div className="rounded-2xl border border-black/10 bg-[var(--shop-secondary)] p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-3xl font-bold text-warm-900">{averageRating ? averageRating.toFixed(1) : '0.0'}</div>
              <div>
                <div className="flex items-center gap-1 text-yellow-500">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} size={16} className={star <= Math.round(averageRating || 0) ? 'fill-current' : 'text-warm-300'} />
                  ))}
                </div>
                <p className="text-sm text-warm-800/60">Based on {totalReviews} review{totalReviews === 1 ? '' : 's'}</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-warm-300 bg-white/30 p-6 text-center text-warm-800/60">
                No reviews yet. Be the first to review this shop.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-black/10 bg-white/50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-warm-200 overflow-hidden flex-shrink-0">
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-warm-800">{(review.userName || 'A').slice(0, 1).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div>
                            <p className="font-semibold text-warm-900">{review.userName || 'Anonymous'}</p>
                            <div className="flex items-center gap-1 text-yellow-500 mt-1">
                              {[1,2,3,4,5].map((star) => (
                                <Star key={star} size={14} className={star <= (review.rating || 0) ? 'fill-current' : 'text-warm-300'} />
                              ))}
                            </div>
                          </div>
                          <time className="text-xs text-warm-800/60">{new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                        </div>
                        <p className="mt-3 text-sm text-warm-800/80 whitespace-pre-wrap">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Services */}
      {shop.services.length > 0 && customization.showServices && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-10 mb-10">
          <SectionHeader
            title="Services"
            subtitle={`${shop.services.length} services offered`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shop.services.map((service) => (
              <BeautyCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
