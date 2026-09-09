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
import { defaultShopCustomization, readableTextColor, shopCustomizationStyle, themeClass, ShopCustomization } from '../../../lib/shop-themes'
import { shareLink } from '../../../lib/share'
import dynamic from 'next/dynamic'

const GoogleMap = dynamic(() => import('../../../components/map/GoogleMap'), { ssr: false })
import { useTheme } from '../../../components/theme/ThemeProvider'

export default function ShopPage() {
  const params = useParams()
  const router = useRouter()
  const { theme } = useTheme()
  const routeSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followMessage, setFollowMessage] = useState('')
  const [messageAccessError, setMessageAccessError] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)

  useEffect(() => {
    loadShop()
  }, [routeSlug])

  const loadShop = async () => {
    setLoading(true)
    try {
      if (!routeSlug) return
      const response = await api.get<Shop>(`/shops/${encodeURIComponent(decodeURIComponent(routeSlug))}`)
      if (response.success && response.data) {
        const mappedShop = mapApiShopToFrontend(response.data)
        setShop(mappedShop)
        setLoading(false)
        checkFollowStatus(mappedShop.id)

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

  const checkFollowStatus = async (shopId?: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token || !shopId) return
    try {
      const response = await api.get<{ following: boolean }>(`/follows/shops/${shopId}/follow-status`)
      if (response.success && response.data) {
        setIsFollowing(response.data.following)
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

    if (!shop?.id) return

    setFollowLoading(true)
    setFollowMessage('')

    try {
      const response = await api.post<{ following: boolean }>(`/follows/shops/${shop.id}/follow`, {})
      if (response.success) {
        const following = response.data?.following ?? !isFollowing
        setIsFollowing(following)
        setFollowMessage(following ? "You're now following this shop" : 'Unfollowed shop')
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

  const handleShareShop = () => {
    if (!shop || typeof window === 'undefined') return
    void shareLink({
      title: shop.name,
      text: `Check out ${shop.name} on PickAmGo`,
      url: window.location.href,
    })
  }

  const handleMessageShop = async () => {
    if (!localStorage.getItem('token')) {
      router.push('/auth/login')
      return
    }
    if (!shop?.owner.id) return

    setMessageAccessError('')
    const response = await api.get<{ allowed: boolean; orderId?: string }>(`/messages/access/${shop.owner.id}?shopId=${encodeURIComponent(shop.id)}`)
    if (response.success && response.data?.allowed) {
      const orderQuery = response.data.orderId ? `?orderId=${encodeURIComponent(response.data.orderId)}` : ''
      router.push(`/messages/${shop.owner.id}${orderQuery}`)
    } else {
      setMessageAccessError(response.error || 'You must be signed in to message this store.')
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
    || (customization.layout === 'FEATURED' ? shop.products[0] : undefined)
  const productGridClass = customization.layout === 'BEAUTY'
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : customization.layout === 'GRID'
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : customization.layout === 'QUICK_PICKS'
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        : `grid-cols-2 md:grid-cols-3 ${customization.productColumns >= 4 ? 'lg:grid-cols-4' : customization.productColumns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`
  const surfaceTextColor = theme === 'dark' ? '#F5F1EA' : readableTextColor(customization.secondaryColor)
  const primaryTextColor = theme === 'dark' ? '#171614' : readableTextColor(customization.primaryColor)
  const panelStyle = { backgroundColor: 'var(--shop-surface)', borderColor: 'var(--shop-border)', color: surfaceTextColor }
  const baseShopStyle = shopCustomizationStyle(customization)

  return (
    <div className={`shop-storefront min-h-screen overflow-x-hidden pb-24 md:pb-8 ${themeClass(customization.theme)}`} style={{ ...baseShopStyle, ...(theme === 'dark' ? {} : { backgroundColor: customization.secondaryColor }), color: surfaceTextColor, '--shop-content-text': surfaceTextColor } as React.CSSProperties}>
      {/* Banner */}
      <div className={`relative ${customization.bannerStyle === 'MINIMAL' ? 'h-20 sm:h-24' : customization.bannerStyle === 'SHORT' ? 'h-28 sm:h-36' : 'h-40 sm:h-48 md:h-64'} bg-[var(--shop-secondary)]`}>
        {(customization.coverImage || shop.banner) && (
          <img
            src={customization.coverImage || shop.banner}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start">
          <button aria-label="Go back" onClick={() => router.back()} className="w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border" style={{ backgroundColor: 'var(--shop-surface)', color: surfaceTextColor, borderColor: 'var(--shop-border)' }}>
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button type="button" aria-label="Share shop" onClick={handleShareShop} className="w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border" style={{ backgroundColor: 'var(--shop-surface)', color: surfaceTextColor, borderColor: 'var(--shop-border)' }}>
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Shop Info */}
      <div className={`max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 ${customization.bannerStyle === 'MINIMAL' ? '-mt-2 sm:-mt-3' : customization.bannerStyle === 'SHORT' ? '-mt-6 sm:-mt-8' : '-mt-8 sm:-mt-12'}`}>
        <div className={`rounded-[var(--shop-card-radius,1rem)] p-3 sm:p-6 shadow-sm border border-[var(--shop-border)] bg-[var(--shop-surface)] ${customization.headerStyle === 'CENTERED' ? 'text-center' : ''}`}>
          <div className={`flex items-start gap-3 sm:gap-4 mb-4 ${customization.headerStyle === 'CENTERED' ? 'flex-col items-center' : ''}`}>
            <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-4 shadow-lg flex-shrink-0 ${customization.bannerStyle === 'MINIMAL' ? '-mt-6 sm:-mt-8' : customization.bannerStyle === 'SHORT' ? '-mt-8 sm:-mt-10' : '-mt-10 sm:-mt-16'}`} style={{ borderColor: 'var(--shop-surface)', backgroundColor: 'var(--shop-secondary)' }}>
              <img
                src={customization.logo || shop.logo}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pt-1 sm:pt-2">
              <div className="flex items-start gap-2 mb-1 min-w-0">
                <h1 className="font-display text-base sm:text-xl font-bold break-words leading-tight" style={{ color: surfaceTextColor }}>{shop.name}</h1>
                 {shop.isVerified && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              <div className="flex items-center gap-1 text-sm opacity-70">
                <MapPin size={14} />
                <span className="min-w-0 break-words">{shop.distance} away · {shop.location}</span>
              </div>
            </div>
          </div>

          <p className="mb-4 opacity-75">{customization.description || shop.description}</p>

          {customization.announcement && <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: 'var(--shop-primary)', color: primaryTextColor }}>{customization.announcement}</div>}

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
              <span key={cat} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-text)' }}>
                {cat}
              </span>
            ))}
          </div>}

          {/* Opening Hours */}
          {customization.showHours && <div className="flex items-start gap-2 text-sm text-[var(--shop-muted)] mb-4">
            <Clock size={16} />
              <span className="opacity-75">{shop.openingHours}</span>
          </div>}

          {/* Delivery Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            {shop.deliveryAvailable && (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-text)' }}>
                Platform Delivery
              </span>
            )}
            {shop.sellerDeliveryAvailable && (
              <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-text)' }}>
                Seller Delivery
              </span>
            )}
            {shop.pickupAvailable && (
              <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-text)' }}>
                Pickup Available
              </span>
            )}
            {shop.platformDeliveryFee !== undefined && shop.platformDeliveryFee > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-text)' }}>
                Delivery: GH₵{shop.platformDeliveryFee.toFixed(2)}
              </span>
            )}
          </div>

          {shop.shippingZones && shop.shippingZones.length > 0 && (
            <div className="mb-5 rounded-xl border border-[var(--shop-border)] p-4" style={{ backgroundColor: 'var(--shop-surface)' }}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold" style={{ color: surfaceTextColor }}><MapPin size={17} />Delivery Areas</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {shop.shippingZones.map(zone => <div key={zone.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--shop-secondary)' }}><p className="font-medium" style={{ color: surfaceTextColor }}>{zone.name}</p><p className="text-xs opacity-75">GH₵{Number(zone.deliveryFee).toFixed(2)} · {zone.estimatedDelivery}{zone.freeDeliveryFrom != null ? ` · Free from GH₵${zone.freeDeliveryFrom}` : ''}</p></div>)}
              </div>
              <p className="mt-3 text-xs opacity-70">Delivery is available to selected locations. Availability is checked for each seller at checkout.</p>
            </div>
          )}

          {shop.collections && shop.collections.length > 0 && <div className="mb-6 space-y-6">{shop.collections.map(collection => <section key={collection.id}><SectionHeader title={collection.name} subtitle={collection.description || undefined} titleStyle={{ color: surfaceTextColor }} subtitleStyle={{ color: surfaceTextColor }} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{(collection.products || []).slice(0, 4).map(item => <ProductCard key={item.product.id} product={mapApiProductToFrontend(item.product)} />)}</div></section>)}</div>}

          {shop.promotions && shop.promotions.length > 0 && <div className="mb-6 rounded-2xl border border-[var(--shop-border)] p-4" style={{ backgroundColor: 'var(--shop-surface)' }}><h2 className="mb-3 font-display text-lg font-bold" style={{ color: surfaceTextColor }}>Current promotions</h2><div className="grid gap-3 sm:grid-cols-2">{shop.promotions.map(promotion => <div key={promotion.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--shop-secondary)' }}><p className="font-semibold" style={{ color: surfaceTextColor }}>{promotion.name}</p><p className="text-xs opacity-75">{promotion.type.replace(/_/g, ' ')} · {promotion.products?.length || 0} products</p></div>)}</div></div>}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Button
              variant={isFollowing ? 'secondary' : 'primary'}
              fullWidth
              onClick={handleFollowToggle}
              disabled={followLoading}
              icon={isFollowing ? <Check size={18} /> : <Plus size={18} />}
              className={`col-span-2 sm:flex-1 !px-3 !py-2.5 text-sm ${isFollowing ? '' : '!bg-[var(--shop-primary)] !text-[var(--shop-primary-text)] hover:!opacity-90'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button className="!px-2 !py-2.5 text-sm" variant="outline" fullWidth icon={<MessageCircle size={17} />} onClick={handleMessageShop}>
              Message
            </Button>
            <Button className="!px-2 !py-2.5 text-sm" variant="ghost" fullWidth icon={<Heart size={17} />} onClick={() => {
              if (!localStorage.getItem('token')) {
                router.push('/auth/login')
                return
              }
              router.push(`/reviews/new?shopId=${shop.id}`)
            }}>
              Write review
            </Button>
          </div>

          {messageAccessError && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
              {messageAccessError}
            </div>
          )}

          {followMessage && (
            <div className={`mt-3 p-3 rounded-xl text-sm text-center`} style={{
              backgroundColor: followMessage.includes('now following') ? 'rgba(34, 197, 94, 0.12)' : 'var(--shop-surface)',
              color: surfaceTextColor,
              border: `1px solid var(--shop-border)`
            }}>
              {followMessage}
            </div>
          )}
        </div>
      </div>

      <section className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 mt-8">
          <div className="rounded-2xl p-4 sm:p-6 border" style={{ backgroundColor: 'var(--shop-secondary)', borderColor: 'var(--shop-border)' }}>
          <h2 className="font-display text-xl font-bold mb-1" style={{ color: surfaceTextColor }}>Find us</h2>
          <p className="text-sm opacity-75 mb-4">{shop.location}</p>
          {shop.latitude != null && shop.longitude != null ? (
            <GoogleMap
              markers={[{ latitude: shop.latitude, longitude: shop.longitude, label: `${shop.name} - ${shop.location}` }]}
              height="280px"
            />
          ) : (
            <div className="rounded-xl border p-4 text-sm opacity-75" style={{ backgroundColor: 'var(--shop-surface)', borderColor: 'var(--shop-border)' }}>
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
            titleStyle={{ color: surfaceTextColor }}
            subtitleStyle={{ color: surfaceTextColor }}
          />
          <div className={`grid ${productGridClass} gap-3 sm:gap-4`}>
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
            titleStyle={{ color: surfaceTextColor }}
            subtitleStyle={{ color: surfaceTextColor }}
          />

          <div className="rounded-2xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--shop-secondary)', borderColor: 'var(--shop-border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="text-3xl font-bold" style={{ color: surfaceTextColor }}>{averageRating ? averageRating.toFixed(1) : '0.0'}</div>
              <div>
                <div className="flex items-center gap-1 text-yellow-500">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} size={16} className={star <= Math.round(averageRating || 0) ? 'fill-current' : 'opacity-35'} />
                  ))}
                </div>
                <p className="text-sm opacity-70">Based on {totalReviews} review{totalReviews === 1 ? '' : 's'}</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center opacity-75" style={{ backgroundColor: 'var(--shop-surface)', borderColor: 'var(--shop-border)' }}>
                No reviews yet. Be the first to review this shop.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: 'var(--shop-surface)', borderColor: 'var(--shop-border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--shop-secondary)' }}>
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold" style={{ color: surfaceTextColor }}>{(review.userName || 'A').slice(0, 1).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div>
                            <p className="font-semibold" style={{ color: surfaceTextColor }}>{review.userName || 'Anonymous'}</p>
                            <div className="flex items-center gap-1 text-yellow-500 mt-1">
                              {[1,2,3,4,5].map((star) => (
                                <Star key={star} size={14} className={star <= (review.rating || 0) ? 'fill-current' : 'opacity-35'} />
                              ))}
                            </div>
                          </div>
                          <time className="text-xs opacity-70">{new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                        </div>
                        <p className="mt-3 text-sm opacity-80 whitespace-pre-wrap">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {customization.showAbout && (
        <section className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 mb-10">
          <div className="rounded-[var(--shop-card-radius,1rem)] border p-4 sm:p-6" style={panelStyle}>
            <h2 className="font-display text-xl font-bold mb-2">About {shop.name}</h2>
            <p className="text-sm opacity-75">{customization.description || shop.description}</p>
            {customization.showContact && <p className="mt-3 text-sm opacity-70">{shop.location}</p>}
          </div>
        </section>
      )}

      {/* Services */}
      {shop.services.length > 0 && customization.showServices && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-10 mb-10">
          <SectionHeader
            title="Services"
            subtitle={`${shop.services.length} services offered`}
            titleStyle={{ color: surfaceTextColor }}
            subtitleStyle={{ color: surfaceTextColor }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shop.services.map((service) => (
              <BeautyCard key={service.id} service={service} onClick={() => router.push(`/service/${service.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
