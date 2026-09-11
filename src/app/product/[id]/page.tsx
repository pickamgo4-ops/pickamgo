'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Heart, Share2, MapPin, Star, Truck, ChevronLeft, Store, Clock, MessageCircle, Minus, Plus, ShoppingCart, Flame, Sparkles, Tag, CheckCircle2, GitCompareArrows } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { api } from '../../../lib/api'
import { Product } from '../../../types'
import { mapApiProductToFrontend } from '../../../lib/api-mappers'
import { getShopUrl } from '../../../lib/shop-url'
import { shareLink } from '../../../lib/share'
import { ProductCard } from '../../../components/product/ProductCard'
import { PaymentSafetyNotice } from '../../../components/ui/PaymentSafetyNotice'
import { ProductReportModal } from '../../../components/ProductReportModal'
import { useRole } from '../../../contexts/RoleContext'
import { defaultShopCustomization, shopCustomizationStyle, themeClass } from '../../../lib/shop-themes'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [showGuestCheckoutNotice, setShowGuestCheckoutNotice] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)
  const [cartSuccess, setCartSuccess] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [offerStatus, setOfferStatus] = useState('')
  const [offerError, setOfferError] = useState('')
  const [offerSubmitting, setOfferSubmitting] = useState(false)
  const [compareStatus, setCompareStatus] = useState('')
  const [alertSubscribed, setAlertSubscribed] = useState(false)
  const [alertStatus, setAlertStatus] = useState('')
  const [alertLoading, setAlertLoading] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [reservationQuantity, setReservationQuantity] = useState(1)
  const [reservation, setReservation] = useState<any>(null)
  const [reservationError, setReservationError] = useState('')
  const [reservationLoading, setReservationLoading] = useState(false)
  const [reservationStatus, setReservationStatus] = useState('')
  const [priceAlertSubscribed, setPriceAlertSubscribed] = useState(false)
  const [priceAlertStatus, setPriceAlertStatus] = useState('')
  const [priceAlertLoading, setPriceAlertLoading] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [questionText, setQuestionText] = useState('')
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [questionSubmitting, setQuestionSubmitting] = useState(false)
  const [questionError, setQuestionError] = useState('')
  const [questionSuccess, setQuestionSuccess] = useState('')

  const activeVariant = product?.variants?.find(v => v.id === selectedVariantId) || null
  const hasVariants = (product?.variants?.length || 0) > 0
  const selectedVariantStock = activeVariant ? (activeVariant.availableStock ?? activeVariant.stock) : (product?.availableStock ?? product?.stock ?? 0)
  const isOutOfStock = hasVariants ? Boolean(selectedVariantId) && selectedVariantStock <= 0 : selectedVariantStock <= 0
  const variantRequiredButNotSelected = hasVariants && !selectedVariantId
  const canPurchase = !isOutOfStock && !variantRequiredButNotSelected
  const isGuest = typeof window !== 'undefined' && !localStorage.getItem('token')
  const shopDisallowsGuestCheckout = isGuest && product?.shop?.allowGuestCheckout === false

  useEffect(() => {
    if (!productId) return
    loadProduct()
    void api.trackProductView(productId)
  }, [productId])

  useEffect(() => {
    const requestedVariantId = searchParams.get('variantId')
    if (requestedVariantId && product?.variants?.some(variant => variant.id === requestedVariantId)) setSelectedVariantId(requestedVariantId)
  }, [product, searchParams])

  useEffect(() => {
    if (!productId) return
    loadRecommendations()
  }, [productId])

  useEffect(() => {
    if (!productId) return
    setQuestionsLoading(true)
    api.getProductQuestions(productId).then(response => {
      if (response.success) setQuestions(response.data || [])
      else setQuestionError(response.error || 'Unable to load questions.')
    }).catch(() => setQuestionError('Something went wrong. Please try again.'))
      .finally(() => setQuestionsLoading(false))
  }, [productId])

  useEffect(() => {
    if (!productId || !authInitialized || !user) return
    checkFavoriteStatus()
  }, [productId, authInitialized, user])

  useEffect(() => {
    if (!productId || !authInitialized || !user) return
    api.getStockAlerts().then(response => {
      if (response.success) setAlertSubscribed((response.data || []).some((alert: any) => alert.active && alert.product?.id === productId && (alert.variant?.id || null) === selectedVariantId))
    }).catch(() => undefined)
  }, [productId, authInitialized, user, selectedVariantId])

  useEffect(() => {
    if (!productId || !authInitialized || !user) return
    api.getPriceAlerts().then(response => {
      if (response.success) setPriceAlertSubscribed((response.data || []).some((alert: any) => alert.active && alert.product?.id === productId && (alert.variant?.id || null) === selectedVariantId))
    }).catch(() => undefined)
  }, [productId, authInitialized, user, selectedVariantId])

  useEffect(() => {
    if (!productId || !authInitialized || !user) return
    api.getReservations().then(response => {
      if (response.success) {
        const active = (response.data || []).find((item: any) => item.status === 'ACTIVE' && item.product?.id === productId && (item.variant?.id || null) === selectedVariantId && new Date(item.expiresAt) > new Date())
        setReservation(active || null)
      }
    }).catch(() => undefined)
  }, [productId, authInitialized, user, selectedVariantId])

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

  const addToCart = useCallback(async (buyNow = false): Promise<boolean | 'blocked' | string> => {
    if (!product) return false
    if (shopDisallowsGuestCheckout) {
      setShowGuestCheckoutNotice(true)
      return 'blocked'
    }
    setAddingToCart(true)
    setCartError(null)
    setCartSuccess('')
    try {
      const response = await api.addToCart({
        productId: product.id,
        variantId: selectedVariantId || undefined,
        quantity,
      })
      if (response.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart-updated'))
        }
        if (!buyNow) setCartSuccess('Added to cart')
        return true
      }
      if (response.code === 'GUEST_CHECKOUT_REQUIRES_AUTH') {
        setShowGuestCheckoutNotice(true)
        return 'blocked'
      }
      setCartError(response.error || response.message || 'Unable to add this item to your cart.')
      return response.error || response.message || 'Unable to add this item to your cart.'
    } catch (err) {
      console.error('Failed to add to cart:', err)
      setCartError('Unable to reach the cart service. Please try again.')
      return 'Unable to reach the cart service. Please try again.'
    } finally {
      setAddingToCart(false)
    }
  }, [product, quantity, selectedVariantId, shopDisallowsGuestCheckout])

  const handleBuyNow = async () => {
    const success = await addToCart(true)
    if (success === true) {
      router.push('/checkout')
    } else if (success !== 'blocked') {
      alert(typeof success === 'string' ? success : cartError || 'Unable to add this item to your cart. Please try again.')
    }
  }

  const handleAddToCart = async () => {
    const result = await addToCart(false)
    if (result === true) {
      router.push('/cart')
    } else if (result !== 'blocked') {
      setCartError(typeof result === 'string' ? result : 'Unable to add this item to your cart.')
    }
  }

  const reserveItem = async () => {
    if (!product) return
    if (!localStorage.getItem('token')) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`)
      return
    }
    setReservationLoading(true)
    setReservationError('')
    setReservationStatus('')
    const response = await api.createReservation({ productId: product.id, variantId: selectedVariantId || undefined, quantity: reservationQuantity })
    if (response.success) {
      setReservation(response.data)
      setReservationOpen(false)
      setReservationStatus(`Reserved until ${new Date(response.data.expiresAt).toLocaleTimeString()}.`)
    } else {
      setReservationError(response.error || 'Unable to reserve this item.')
    }
    setReservationLoading(false)
  }

  const handleShareProduct = () => {
    if (!product || typeof window === 'undefined') return
    void shareLink({
      title: product.name,
      text: `Check out ${product.name} on PickAmGo`,
      url: window.location.href,
    })
  }

  const submitQuestion = async () => {
    if (!product || !questionText.trim()) return
    if (!localStorage.getItem('token')) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`)
      return
    }
    setQuestionSubmitting(true)
    setQuestionError('')
    setQuestionSuccess('')
    try {
      const response = await api.askProductQuestion(product.id, questionText.trim())
      if (!response.success) {
        setQuestionError(response.error || 'Unable to submit your question.')
        return
      }
      setQuestions(current => [response.data, ...current])
      setQuestionText('')
      setQuestionSuccess('Question submitted.')
    } catch {
      setQuestionError('Something went wrong. Please try again.')
    } finally {
      setQuestionSubmitting(false)
    }
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
    id: product.id,
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
    allowOffers: product.allowOffers,
    minimumOfferAmount: product.minimumOfferAmount,
    allowCounteroffers: product.allowCounteroffers,
  } as Product
  const customization = { ...defaultShopCustomization, ...(safeProduct.shop?.customization || {}) }
  const selectedAvailableStock = activeVariant?.availableStock ?? safeProduct.availableStock ?? safeProduct.stock
  const canReserve = safeProduct.allowReservations !== false && selectedAvailableStock > 0 && (!hasVariants || Boolean(selectedVariantId))

  const submitOffer = async () => {
    const amount = Number(offerAmount)
    if (!Number.isFinite(amount) || amount <= 0) { setOfferError('Enter a valid offer amount.'); return }
    if (!localStorage.getItem('token')) { router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`); return }
    setOfferSubmitting(true); setOfferError(''); setOfferStatus('')
    const response = await api.createOffer(safeProduct.id, { offerAmount: amount, buyerMessage: offerMessage.trim() || undefined })
    if (response.success) { setOfferStatus('Offer submitted.'); setOfferAmount(''); setOfferMessage('') }
    else setOfferError(response.error || 'Unable to submit offer.')
    setOfferSubmitting(false)
  }

  const subscribeToRestock = async () => {
    if (!localStorage.getItem('token')) { router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`); return }
    setAlertLoading(true); setAlertStatus('')
    const response = await api.subscribeStockAlert(safeProduct.id, selectedVariantId || undefined)
    if (response.success) { setAlertSubscribed(true); setAlertStatus(response.message || 'You will be notified when this is back in stock.') }
    else if (response.message?.toLowerCase().includes('already') || response.error?.toLowerCase().includes('already')) { setAlertSubscribed(true); setAlertStatus("You're already on the restock list.") }
    else setAlertStatus(response.error || 'Something went wrong. Please try again.')
    setAlertLoading(false)
  }

  const subscribeToPriceDrop = async () => {
    if (!localStorage.getItem('token')) { router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`); return }
    setPriceAlertLoading(true); setPriceAlertStatus('')
    const response = await api.subscribePriceAlert(safeProduct.id, selectedVariantId || undefined)
    if (response.success) { setPriceAlertSubscribed(true); setPriceAlertStatus(response.message || 'You will be notified if the price drops.') }
    else if (response.message?.toLowerCase().includes('already') || response.error?.toLowerCase().includes('already')) { setPriceAlertSubscribed(true); setPriceAlertStatus("You're already watching this price.") }
    else setPriceAlertStatus(response.error || 'Something went wrong. Please try again.')
    setPriceAlertLoading(false)
  }

  const createReservation = async () => {
    if (!localStorage.getItem('token')) { router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`); return }
    setReservationLoading(true); setReservationError('')
    const response = await api.createReservation({ productId: safeProduct.id, variantId: selectedVariantId || undefined, quantity: reservationQuantity })
    if (response.success) { setReservation(response.data); setReservationOpen(false) }
    else setReservationError(response.error || 'Unable to reserve this item.')
    setReservationLoading(false)
  }

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
                <button type="button" aria-label="Report product" onClick={() => { if (!localStorage.getItem('token')) router.push('/auth/login'); else setReportOpen(true) }} className="h-10 rounded-full bg-white/90 px-3 text-xs font-semibold text-red-600 shadow-sm">Report</button>
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
            const displayDiscount = activeVariant
              ? ((activeVariant.originalPrice && activeVariant.price && activeVariant.originalPrice > activeVariant.price) ? Math.round(((activeVariant.originalPrice - activeVariant.price) / activeVariant.originalPrice) * 100) : undefined)
              : safeProduct.discount
            const displayStock = activeVariant ? activeVariant.stock : safeProduct.stock
            const isOutOfStock = hasVariants ? Boolean(selectedVariantId) && displayStock <= 0 : displayStock <= 0

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
                      {displayDiscount}% OFF
                    </span>
                  )}
                </div>

                {isOutOfStock && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-medium">Out of stock</p>
                    <button type="button" onClick={subscribeToRestock} disabled={alertLoading || alertSubscribed} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
                      {alertLoading ? 'Saving...' : alertSubscribed ? "You're already on the restock list." : 'Notify Me'}
                    </button>
                    {alertStatus && <p className="mt-2 font-normal" role="status">{alertStatus}</p>}
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

         <section className="mb-8 border-t border-warm-200 pt-6" aria-labelledby="questions-heading">
           <div className="flex items-center justify-between gap-3 mb-4">
             <h2 id="questions-heading" className="font-semibold text-lg text-warm-900">Questions &amp; Answers</h2>
             <span className="text-sm text-warm-800/60">{questions.length} question{questions.length === 1 ? '' : 's'}</span>
           </div>
           {questionsLoading ? <p className="text-sm text-warm-800/60">Loading questions...</p> : questions.length === 0 ? (
             <p className="text-sm text-warm-800/60">No questions yet.</p>
           ) : (
             <div className="space-y-4">
               {questions.map(item => (
                 <div key={item.id} className="border-b border-warm-100 pb-4 last:border-0">
                   <div className="flex items-start justify-between gap-3">
                     <div>
                       <p className="font-medium text-warm-900">{item.question}</p>
                       <p className="mt-1 text-xs text-warm-800/50">Asked by {item.buyerName || 'Buyer'} on {new Date(item.createdAt).toLocaleDateString()}</p>
                     </div>
                     {item.isOwner && !item.answer && <button type="button" onClick={async () => { const response = await api.deleteProductQuestion(item.id); if (response.success) setQuestions(current => current.filter(question => question.id !== item.id)) }} className="text-xs text-red-600 hover:underline">Delete</button>}
                   </div>
                   {item.answer && <p className="mt-2 border-l-2 border-primary pl-3 text-sm text-warm-800/70"><span className="font-semibold text-warm-900">Seller response:</span> {item.answer}</p>}
                 </div>
               ))}
             </div>
           )}
           <div className="mt-5">
             <label htmlFor="product-question" className="sr-only">Ask a question about this product</label>
             <textarea id="product-question" value={questionText} onChange={event => setQuestionText(event.target.value)} maxLength={500} rows={3} placeholder="Ask a question about this product" className="w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
             <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
               <span className="text-xs text-warm-800/50">{questionText.length}/500</span>
               <Button size="sm" onClick={submitQuestion} disabled={questionSubmitting || questionText.trim().length < 5}>{questionSubmitting ? 'Submitting...' : 'Ask question'}</Button>
             </div>
             {(questionError || questionSuccess) && <p className={`mt-2 text-sm ${questionError ? 'text-red-600' : 'text-green-600'}`} role="status">{questionError || questionSuccess}</p>}
           </div>
         </section>

        {/* Quantity & Actions */}
        {safeProduct.allowOffers && !isOutOfStock && <Button variant="outline" fullWidth className="mb-3" onClick={() => { setOfferOpen(true); setOfferError(''); setOfferStatus('') }}>Make an Offer</Button>}
        {canReserve && !reservation && <Button variant="outline" fullWidth className="mb-3" onClick={() => { setReservationOpen(true); setReservationQuantity(Math.min(1, selectedAvailableStock)); setReservationError('') }}><Clock size={17} /> Reserve for 30 minutes</Button>}
        {reservation && <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary" role="status">Reserved until {new Date(reservation.expiresAt).toLocaleTimeString()} <button type="button" className="ml-2 underline" onClick={() => router.push('/account/reservations')}>Manage reservation</button></div>}
        {reservationStatus && !reservation && <p className="-mt-2 mb-3 text-center text-sm text-primary" role="status">{reservationStatus}</p>}
        <Button variant="ghost" fullWidth className="mb-3" onClick={subscribeToPriceDrop} disabled={priceAlertLoading || priceAlertSubscribed}>{priceAlertLoading ? 'Saving...' : priceAlertSubscribed ? "You're already watching this price." : 'Alert me when the price drops'}</Button>
        {priceAlertStatus && <p className="-mt-2 mb-3 text-center text-sm text-primary" role="status">{priceAlertStatus}</p>}
        <Button variant="ghost" fullWidth className="mb-3" onClick={() => { if (variantRequiredButNotSelected) { setCompareStatus('Select a variant before comparing prices.'); return }; router.push(`/product/${safeProduct.id}/compare${selectedVariantId ? `?variantId=${encodeURIComponent(selectedVariantId)}` : ''}`) }}><GitCompareArrows size={17} /> Compare prices</Button>
        {compareStatus && <p className="-mt-2 mb-3 text-center text-sm text-primary" role="status">{compareStatus}</p>}
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
            variant="orange"
            fullWidth
            className="flex-1"
            onClick={handleAddToCart}
            disabled={addingToCart || !canPurchase}
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
          <Button
            variant="success"
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
             onClick={handleAddToCart}
             disabled={addingToCart || !canPurchase}
             className="p-2.5 rounded-xl border border-warm-200 hover:bg-warm-100 transition-colors disabled:opacity-50"
             aria-label="Add to cart"
           >
             <ShoppingCart size={20} className={addingToCart ? 'text-warm-800/50' : 'text-warm-800'} />
           </button>
           <Button
             variant="success"
             fullWidth
             className="flex-[2]"
             onClick={handleBuyNow}
             disabled={addingToCart || !canPurchase}
           >
             {addingToCart ? 'Adding...' : 'Buy Now'}
           </Button>
        </div>
        {(cartError || cartSuccess) && (
          <p className={`mt-3 text-center text-sm font-medium ${cartError ? 'text-red-600' : 'text-green-600'}`} role="status">
            {cartError || cartSuccess}
          </p>
        )}
      </div>

      {showGuestCheckoutNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-display text-xl font-bold text-warm-900">Sign in required</h2>
            <p className="mt-2 text-sm text-warm-800/70">
              This shop does not allow guest checkout, so you need to sign in before adding this item to your cart and completing your purchase.
            </p>
            <div className="mt-6 flex gap-3">
              <Button fullWidth onClick={() => router.push(`/auth/login?returnTo=${encodeURIComponent(`/product/${productId}`)}`)}>Sign In</Button>
              <Button variant="ghost" fullWidth onClick={() => setShowGuestCheckoutNotice(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
      {offerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="offer-heading">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="offer-heading" className="font-display text-xl font-bold text-warm-900">Make an Offer</h2><p className="mt-1 text-sm text-warm-800/60">{safeProduct.name}</p></div><button type="button" aria-label="Close offer form" onClick={() => setOfferOpen(false)} className="text-2xl text-warm-800/50">×</button></div><p className="mt-5 text-sm text-warm-800/70">Current price <span className="font-semibold text-warm-900">GH₵{Number(safeProduct.price).toFixed(2)}</span></p>{safeProduct.minimumOfferAmount && <p className="mt-1 text-xs text-warm-800/50">Minimum offer: GH₵{Number(safeProduct.minimumOfferAmount).toFixed(2)}</p>}<div className="mt-4 space-y-3"><Input label="Your offer" type="number" min={safeProduct.minimumOfferAmount || 0.01} step="0.01" value={offerAmount} onChange={event => setOfferAmount(event.target.value)} placeholder="0.00" /><label className="block text-sm font-medium text-warm-900">Message (optional)<textarea value={offerMessage} onChange={event => setOfferMessage(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-warm-200 p-3 text-sm" /></label></div>{(offerError || offerStatus) && <p className={`mt-3 text-sm ${offerError ? 'text-red-600' : 'text-green-600'}`} role="status">{offerError || offerStatus}</p>}<div className="mt-5 flex gap-3"><Button fullWidth variant="ghost" onClick={() => setOfferOpen(false)}>Cancel</Button><Button fullWidth onClick={submitOffer} disabled={offerSubmitting}>{offerSubmitting ? 'Submitting...' : 'Submit offer'}</Button></div></div>
        </div>
      )}
      {reservationOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reservation-heading"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="reservation-heading" className="font-display text-xl font-bold text-warm-900">Reserve for 30 minutes</h2><p className="mt-2 text-sm text-warm-800/70">Hold this item while you complete checkout. The server confirms availability before reserving.</p><Input className="mt-4" label="Quantity" type="number" min="1" max={selectedVariantStock || safeProduct.availableStock || safeProduct.stock} value={reservationQuantity} onChange={event => setReservationQuantity(Math.max(1, Number(event.target.value) || 1))} />{reservationError && <p className="mt-3 text-sm text-red-600" role="alert">{reservationError}</p>}<div className="mt-5 flex gap-3"><Button variant="ghost" fullWidth onClick={() => setReservationOpen(false)}>Cancel</Button><Button fullWidth onClick={createReservation} disabled={reservationLoading}>{reservationLoading ? 'Reserving...' : 'Reserve Item'}</Button></div></div></div>}
      {reportOpen && <ProductReportModal productId={safeProduct.id} onClose={() => setReportOpen(false)} onSubmit={data => api.submitReport({ ...data, targetType: 'PRODUCT', targetId: safeProduct.id })} />}

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
