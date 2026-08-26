'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, Share2, MapPin, Star, Truck, ChevronLeft, Store, Clock, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { api } from '../../../lib/api'
import { Product, CartItemWithRelations } from '../../../types'
import { mapApiProductToFrontend } from '../../../lib/api-mappers'
import { ProductCard } from '../../../components/product/ProductCard'
import { PaymentSafetyNotice } from '../../../components/ui/PaymentSafetyNotice'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [params.id])

  useEffect(() => {
    loadRecommendations()
  }, [params.id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const response = await api.get<Product>(`/products/${params.id}`)
      if (response.success && response.data) {
        setProduct(mapApiProductToFrontend(response.data))
      }
    } catch (err) {
      console.error('Failed to load product:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async () => {
    setRecommendationsLoading(true)
    try {
      const response = await api.get<any[]>(`/products/${params.id}/recommendations`)
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        if (!buyNow) router.push('/auth/login')
        return false
      }
      const response = await api.post<CartItemWithRelations>('/cart/items', {
        productId: product.id,
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
  }, [product, quantity, router])

  const handleBuyNow = async () => {
    const success = await addToCart(true)
    if (success) {
      router.push('/checkout')
    } else {
      alert('Failed to add to cart. Please try again.')
    }
  }

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

  const images = [product.image, ...(product.images || [product.image])]

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <PaymentSafetyNotice />
      </div>
      {/* Image Gallery */}
      <div className="relative aspect-square md:aspect-[4/3] bg-warm-100">
        <img
          src={images[selectedImage]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
            >
              <Heart
                size={20}
                className={isFavorite ? 'fill-red-500 text-red-500' : 'text-warm-800'}
              />
            </button>
            <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
              <Share2 size={20} className="text-warm-800" />
            </button>
          </div>
        </div>
        {/* Image dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === selectedImage ? 'bg-white w-4' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Category & Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {product.isTrending && <Badge variant="trending">🔥 Trending</Badge>}
          {product.isNew && <Badge variant="new">🆕 New</Badge>}
          {product.isDeal && <Badge variant="deal">💸 Deal</Badge>}
          {product.isVerified && <Badge variant="verified">✅ Verified</Badge>}
        </div>

        {/* Name */}
        <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-2">
          {product.name}
        </h1>

        {/* Price */}
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-3xl font-bold text-warm-900">
            GH₵{product.price}
          </span>
          {product.originalPrice && (
            <span className="text-lg text-warm-800/40 line-through">
              GH₵{product.originalPrice}
            </span>
          )}
          {product.discount && (
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
              Save {product.discount}%
            </span>
          )}
        </div>

        {/* Rating & Location */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-warm-800/70">
          <div className="flex items-center gap-1">
            <Star size={18} className="fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-warm-900">{product.rating}</span>
            <span>({product.reviews} reviews)</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={18} />
            <span>{product.distance} away</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck size={18} />
            <span>{product.deliveryTime}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-warm-900 mb-2">Description</h2>
          <p className="text-warm-800/70 leading-relaxed">{product.description}</p>
        </div>

        {/* Seller Info */}
        <div className="bg-white rounded-2xl p-4 border border-warm-200 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-warm-200">
              <img
                src={product.seller.avatar}
                alt={product.seller.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-warm-900">{product.seller.name}</h3>
              {product.shop && (
                <button
                  onClick={() => router.push(`/shop/${product.shop!.slug}`)}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  <Store size={14} />
                  {product.shop.name}
                </button>
              )}
              <p className="text-sm text-warm-800/60">{product.seller.location}</p>
            </div>
            <div className="flex flex-col gap-2">
              {product.shop && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Store size={16} />}
                  onClick={() => router.push(`/shop/${product.shop!.slug}`)}
                >
                  Visit Shop
                </Button>
              )}
              <Button variant="outline" size="sm" icon={<MessageCircle size={16} />} onClick={() => router.push(`/messages/${product.seller.id}`)}>
                Message
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-warm-800/60">
            <div className="flex items-center gap-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span>{product.seller.rating} seller rating</span>
            </div>
            <span>Usually responds in {product.seller.responseTime}</span>
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
            onClick={() => setIsFavorite(!isFavorite)}
          >
            Save
          </Button>
          <Button
            variant="outline"
            fullWidth
            className="flex-1"
            onClick={() => addToCart(false)}
            disabled={addingToCart}
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
          <Button
            variant="primary"
            fullWidth
            className="flex-[2]"
            onClick={handleBuyNow}
            disabled={addingToCart}
          >
            {addingToCart ? 'Adding...' : 'Buy Now'}
          </Button>
        </div>

        {/* Mobile Actions */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-200 px-4 py-3 flex gap-3 items-center">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2.5 rounded-xl border border-warm-200 hover:bg-warm-100 transition-colors"
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
            disabled={addingToCart}
            className="p-2.5 rounded-xl border border-warm-200 hover:bg-warm-100 transition-colors"
            aria-label="Add to cart"
          >
            <ShoppingCart size={20} className={addingToCart ? 'text-warm-800/50' : 'text-warm-800'} />
          </button>
          <Button
            variant="primary"
            fullWidth
            className="flex-[2]"
            onClick={handleBuyNow}
            disabled={addingToCart}
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
