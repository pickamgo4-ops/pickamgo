'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, Share2, MapPin, Star, Truck, ChevronLeft, Store, Clock, MessageCircle, Minus, Plus, ShoppingCart, Flame, Sparkles, Tag, CheckCircle2 } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { api } from '../../../lib/api'
import { Product, CartItemWithRelations } from '../../../types'
import { mapApiProductToFrontend } from '../../../lib/api-mappers'
import { getShopUrl } from '../../../lib/shop-url'
import { shareLink } from '../../../lib/share'
import { ProductCard } from '../../../components/product/ProductCard'
import { PaymentSafetyNotice } from '../../../components/ui/PaymentSafetyNotice'
import { useRole } from '../../../contexts/RoleContext'
import { defaultShopCustomization, shopCustomizationStyle, themeClass } from '../../../lib/shop-themes'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { user, authInitialized } = useRole()
  const productId = typeof params?.id === 'string' ? params.id : ''
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  const activeVariant = product?.variants?.find(v => v.id === selectedVariantId) || null
  const hasVariants = (product?.variants?.length || 0) > 0
  const selectedVariantStock = activeVariant ? activeVariant.stock : (product?.stock ?? 0)
  const isOutOfStock = selectedVariantStock <= 0
  const variantRequiredButNotSelected = hasVariants && !selectedVariantId
  const canPurchase = !isOutOfStock && !variantRequiredButNotSelected

  useEffect(() => {
    if (!productId) return
    loadProduct()
  }, [productId])

  useEffect(() => {
    if (!productId) return
    loadRecommendations()
  }, [productId])

  useEffect(() => {
    if (!productId || !authInitialized || !user) return
    checkFavoriteStatus()
  }, [productId, authInitialized, user])

  const checkFavoriteStatus = useCallback(async () => {
    if (!productId || !user) return
    try {
      const res = await api.getFavorites({ type: 'PRODUCT' })
      if (res.success && res.data) {
        const isFav = res.data.favorites.some((fav: any) => fav.targetId === productId)
        setIsFavorite(isFav)
      }
    } catch {
      // ignore
    }
  }, [productId, user])

  const toggleFavorite = async () => {
    if (!product) return
    setFavoriteLoading(true)
    try {
      if (isFavorite) {
        await api.removeFavorite('PRODUCT', product.id)
        setIsFavorite(false)
      } else {
        await api.addFavorite('PRODUCT', product.id)
        setIsFavorite(true)
      }
    } catch {
      // ignore
    } finally {
      setFavoriteLoading(false)
    }
  }

  const loadProduct = async () => {
    if (!productId) return
    setLoading(true)
    setLoadError(null)
    try {
      const response = await api.get<Product>(`/products/${productId}`)
      if (response.success && response.data) {
        setProduct(mapApiProductToFrontend(response.data))
      } else {
        setLoadError(response.error || 'Failed to load product')
      }
    } catch (err) {
      console.error('Failed to load product:', err)
      setLoadError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async () => {
    if (!productId) return
    setRecommendationsLoading(true)
    try {
      const response = await api.get<any[]>(`/products/${productId}/recommendations`)
      if (response.success && response.data) {
        setRecommendations(response.data.map(mapApiProductToFrontend))
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  const addToCart = useCallback(async (buyNow = false) => {
    if (!product) return false
    setAddingToCart(true)
    try {
      const response = await api.post<CartItemWithRelations>('/cart/items', {
        productId: product.id,
        variantId: selectedVariantId || undefined,
        quantity,
      })
      if (response.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart-updated'))
        }
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to add to cart:', err)
      return false
    } finally {
      setAddingToCart(false)
    }
  }, [product, quantity, selectedVariantId])

  const handleBuyNow = async () => {
    const success = await addToCart(true)
    if (success) {
      router.push('/checkout')
    } else {
      alert('Failed to add to cart. Please try again.')
    }
  }

  const handleShareProduct = () => {
    if (!product || typeof window === 'undefined') return
    void shareLink({
      title: product.name,
      text: `Check out ${product.name} on PickAmGo`,
      url: window.location.href,
    })
  }

  const images = product
    ? Array.from(new Set([product.image, ...(product.images || []), product.image].filter(Boolean)))
    : []

  useEffect(() => {
    if (selectedImage >= images.length) {
      setSelectedImage(0)
    }
  }, [images.length, selectedImage])

  useEffect(() => {
    if (images.length < 2) return
    const interval = window.setInterval(() => {
      setSelectedImage(current => (current + 1) % images.length)
    }, 4000)
    return () => window.clearInterval(interval)
  }, [images.length])

  const showPreviousImage = () => {
    setSelectedImage(current => (current - 1 + images.length) % images.length)
  }

  const showNextImage = () => {
    setSelectedImage(current => (current + 1) % images.length)
  }

  useEffect(() => {
    if (!isImageViewerOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsImageViewerOpen(false)
      if (event.key === 'ArrowLeft') showPreviousImage()
      if (event.key === 'ArrowRight') showNextImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isImageViewerOpen])

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading product...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-800/60 text-lg">{loadError}</p>
          <Button className="mt-4" onClick={() => router.push('/')}>Go back home</Button>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-800/60 text-lg">Product not found</p>
          <Button className="mt-4" onClick={() => router.push('/')}>Go back home</Button>
        </div>
      </div>
    )
  }

  const safeProduct: Product = {
    image: product.image || '',
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    name: product.name || 'Untitled Product',
    price: product.price || 0,
    originalPrice: product.originalPrice,
    discount: product.discount,
    description: product.description || '',
    category: product.category || '',
    seller: product.seller || { id: '', name: 'Unknown Seller', avatar: '', location: '', rating: 0, isVerified: false, responseTime: '' },
    shop: product.shop || undefined,
    location: product.location || '',
    distance: product.distance || '',
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    isTrending: product.isTrending || false,
    isNew: product.isNew || false,
    isDeal: product.isDeal || false,
    isVerified: product.isVerified || false,
    isFavorite: product.isFavorite || false,
    stock: product.stock ?? 0,
    sku: product.sku,
    brand: product.brand,
    shortDescription: product.shortDescription,
    variants: product.variants,
    createdAt: product.createdAt,
  } as Product
  const customization = { ...defaultShopCustomization, ...(safeProduct.shop?.customization || {}) }

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${themeClass(customization.theme)}`} style={{ ...shopCustomizationStyle(customization), color: 'var(--shop-text)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <PaymentSafetyNotice />
      </div>
      {/* Image Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[110px_minmax(0,1fr)] gap-4 lg:gap-5">
          <div className="order-2 lg:order-1 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
             {images.map((image, index) => (
               <button
                 key={`${image}-${index}`}
                 type="button"
                 onClick={() => setSelectedImage(index)}
                 className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border transition-all ${
                   index === selectedImage ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-warm-200 hover:border-primary/40'
                 }`}
               >
                 <img src={image} alt={`${safeProduct.name} view ${index + 1}`} className="h-full w-full object-cover" />
               </button>
             ))}
          </div>

          <div className="order-1 lg:order-2 relative overflow-hidden rounded-3xl border border-warm-200 bg-warm-100 shadow-sm">
            <div className="relative aspect-square md:aspect-[4/3]">
               <img
                 src={images[selectedImage] || safeProduct.image}
                 alt={safeProduct.name}
                 onClick={() => setIsImageViewerOpen(true)}
                 className="h-full w-full object-cover"
               />
            </div>
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <button onClick={() => router.back()} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
                >
                  <Heart
                    size={20}
                    className={isFavorite ? 'fill-red-500 text-red-500' : 'text-warm-800'}
                  />
                </button>
                <button type="button" aria-label="Share product" onClick={handleShareProduct} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <Share2 size={20} className="text-warm-800" />
                </button>
              </div>
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous product image"
                  onClick={showPreviousImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next product image"
                  onClick={showNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              </>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === selectedImage ? 'w-5 bg-white' : 'w-2 bg-white/55'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {isImageViewerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${safeProduct.name} image viewer`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <button
            type="button"
            aria-label="Close image viewer"
            onClick={() => setIsImageViewerOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl text-warm-900 shadow-sm"
          >
            ×
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous full-size image"
                onClick={(event) => { event.stopPropagation(); showPreviousImage() }}
                className="absolute left-3 sm:left-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Next full-size image"
                onClick={(event) => { event.stopPropagation(); showNextImage() }}
                className="absolute right-3 sm:right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm"
              >
                <ChevronLeft size={22} className="rotate-180" />
              </button>
            </>
          )}
          <img
            src={images[selectedImage] || safeProduct.image}
            alt={safeProduct.name}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] object-contain"
          />
        </div>
      )}

      {/* Product Info */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
         {/* Category & Badges */}
         <div className="flex flex-wrap gap-2 mb-3">
           {safeProduct.isTrending && <Badge variant="trending"><Flame size={12} /> Trending</Badge>}
           {safeProduct.isNew && <Badge variant="new"><Sparkles size={12} /> New</Badge>}
           {safeProduct.isDeal && <Badge variant="deal"><Tag size={12} /> Deal</Badge>}
           {safeProduct.isVerified && <Badge variant="verified"><CheckCircle2 size={12} /> Verified</Badge>}
         </div>

          {/* Name */}
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-2">
            {safeProduct.name}
          </h1>

          {safeProduct.variants && safeProduct.variants.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-warm-900 mb-2">Select Option</label>
              <div className="flex flex-wrap gap-2">
                {safeProduct.variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id
                  const isOutOfStock = variant.stock <= 0
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariantId(isSelected ? null : variant.id)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : isOutOfStock
                            ? 'border-warm-200 text-warm-800/40 cursor-not-allowed line-through'
                            : 'border-warm-200 hover:border-primary/40 text-warm-900'
                      }`}
                    >
                      {variant.name}
                      {variant.stock <= 5 && variant.stock > 0 && (
                        <span className="ml-2 text-xs text-orange-600">Only {variant.stock} left</span>
                      )}
                      {isOutOfStock && <span className="ml-2 text-xs text-red-600">Out of stock</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(() => {
            const activeVariant = safeProduct.variants?.find(v => v.id === selectedVariantId)
            const displayPrice = activeVariant ? (activeVariant.price || safeProduct.price) : safeProduct.price
            const displayOriginalPrice = activeVariant ? (activeVariant.originalPrice || safeProduct.originalPrice) : safeProduct.originalPrice
            const displayDiscount = activeVariant ? ((activeVariant.originalPrice && activeVariant.price && activeVariant.originalPrice > activeVariant.price) ? Math.round(((activeVariant.originalPrice - activeVariant.price) / activeVariant.originalPrice) * 100) : undefined) : safeProduct.discount
            const displayStock = activeVariant ? activeVariant.stock : safeProduct.stock
            const isOutOfStock = displayStock <= 0

            return (
              <>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold text-warm-900">
                    GH₵{displayPrice}
                  </span>
                  {displayOriginalPrice && (
                    <span className="text-lg text-warm-800/40 line-through">
                      GH₵{displayOriginalPrice}
                    </span>
                  )}
                  {displayDiscount && (
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      Save {displayDiscount}%
                    </span>
                  )}
                </div>

                {isOutOfStock && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                    Out of stock
                  </div>
                )}

                {!isOutOfStock && displayStock <= 5 && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm font-medium">
                    Only {displayStock} left in stock
                  </div>
                )}
              </>
            )
          })()}

          {/* Rating & Location */}
         <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-warm-800/70">
           <div className="flex items-center gap-1">
             <Star size={18} className="fill-yellow-400 text-yellow-400" />
             <span className="font-semibold text-warm-900">{safeProduct.rating}</span>
             <span>({safeProduct.reviews} reviews)</span>
           </div>
           <div className="flex items-center gap-1">
             <MapPin size={18} />
             <span>{safeProduct.distance} away</span>
           </div>
           <div className="flex items-center gap-1">
             <Truck size={18} />
             <span>2-3 days</span>
           </div>
         </div>

         {/* Description */}
         <div className="mb-8">
           <h2 className="font-semibold text-lg text-warm-900 mb-2">Description</h2>
           <p className="text-warm-800/70 leading-relaxed">{safeProduct.description}</p>
         </div>

         {/* Seller Info */}
         <div className="bg-white rounded-2xl p-4 border border-warm-200 mb-6">
           <div className="flex items-center gap-3 mb-3">
             <div className="w-12 h-12 rounded-full overflow-hidden bg-warm-200">
               <img
                 src={safeProduct.seller.avatar}
                 alt={safeProduct.seller.name}
                 className="w-full h-full object-cover"
               />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold text-warm-900">{safeProduct.seller.name}</h3>
               {safeProduct.shop && (
                 <button
                   onClick={() => safeProduct.shop && window.location.assign(getShopUrl(safeProduct.shop.slug))}
                   className="text-sm text-primary hover:underline flex items-center gap-1 mt-0.5"
                 >
                   <Store size={14} />
                   {safeProduct.shop.name}
                 </button>
               )}
               <p className="text-sm text-warm-800/60">{safeProduct.seller.location}</p>
             </div>
             <div className="flex flex-col gap-2">
               {safeProduct.shop && (
                 <Button
                   variant="outline"
                   size="sm"
                   icon={<Store size={16} />}
                   onClick={() => safeProduct.shop && window.location.assign(getShopUrl(safeProduct.shop.slug))}
                 >
                   Visit Shop
                 </Button>
               )}
               <Button variant="outline" size="sm" icon={<MessageCircle size={16} />} onClick={() => {
                 if (!localStorage.getItem('token')) {
                   router.push('/auth/login')
                   return
                 }
                 router.push(`/messages/${safeProduct.seller.id}`)
               }}>
                 Message
               </Button>
             </div>
           </div>
           <div className="flex items-center gap-4 text-sm text-warm-800/60">
             <div className="flex items-center gap-1">
               <Star size={14} className="fill-yellow-400 text-yellow-400" />
               <span>{safeProduct.seller.rating} seller rating</span>
             </div>
             <span>Usually responds in {safeProduct.seller.responseTime}</span>
           </div>
         </div>

        {/* Quantity & Actions */}
        <div className="hidden sm:flex gap-3 sticky bottom-4 md:relative z-10">
          <div className="flex items-center gap-2 bg-white border border-warm-200 rounded-xl px-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1 text-warm-800 hover:text-primary transition-colors"
            >
              <Minus size={18} />
            </button>
            <span className="w-8 text-center font-semibold text-warm-900">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 text-warm-800 hover:text-primary transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <Button
            variant="secondary"
            fullWidth
            className="flex-1"
            icon={<Heart size={18} />}
            onClick={toggleFavorite}
            disabled={favoriteLoading}
          >
            Save
          </Button>
          <Button
            variant="outline"
            fullWidth
            className="flex-1"
            onClick={() => addToCart(false)}
            disabled={addingToCart || !canPurchase}
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
          <Button
            variant="primary"
            fullWidth
            className="flex-[2]"
            onClick={handleBuyNow}
            disabled={addingToCart || !canPurchase}
          >
            {addingToCart ? 'Adding...' : 'Buy Now'}
          </Button>
        </div>

        {/* Mobile Actions */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-200 px-4 py-3 flex gap-3 items-center">
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className="p-2.5 rounded-xl border border-warm-200 hover:bg-warm-100 transition-colors disabled:opacity-50"
          >
            <Heart size={20} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-warm-800'} />
          </button>
          <div className="flex items-center gap-2 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1 text-warm-800 hover:text-primary transition-colors"
            >
              <Minus size={18} />
            </button>
            <span className="w-6 text-center font-semibold text-warm-900 text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 text-warm-800 hover:text-primary transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
           <button
             onClick={() => addToCart(false)}
             disabled={addingToCart || !canPurchase}
             className="p-2.5 rounded-xl border border-warm-200 hover:bg-warm-100 transition-colors disabled:opacity-50"
             aria-label="Add to cart"
           >
             <ShoppingCart size={20} className={addingToCart ? 'text-warm-800/50' : 'text-warm-800'} />
           </button>
           <Button
             variant="primary"
             fullWidth
             className="flex-[2]"
             onClick={handleBuyNow}
             disabled={addingToCart || !canPurchase}
           >
             {addingToCart ? 'Adding...' : 'Buy Now'}
           </Button>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="font-display text-xl md:text-2xl font-bold text-warm-900 mb-6">
          Things You May Like
        </h2>

        {recommendationsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-warm-200/50 animate-pulse">
                <div className="aspect-square bg-warm-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-warm-100 rounded" />
                  <div className="h-4 bg-warm-100 rounded w-2/3" />
                  <div className="h-6 bg-warm-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8 text-warm-800/60">
            <p>No recommendations available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <ProductCard
                key={rec.id}
                product={rec}
                onClick={() => router.push(`/product/${rec.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
