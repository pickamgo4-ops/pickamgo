import React from 'react'
import { Heart, Share2, MapPin, Star, Clock, Flame, Sparkles, Tag, CheckCircle2 } from 'lucide-react'
import { Product } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { shareLink } from '../../lib/share'
import { shopCustomizationStyle } from '../../lib/shop-themes'

interface ProductCardProps {
  product: Product
  onClick?: () => void
  onFavorite?: () => void
}

export function ProductCard({ product, onClick, onFavorite }: ProductCardProps) {
  const customization = product.shop?.customization
  return (
    <div
      onClick={onClick}
      style={customization ? shopCustomizationStyle(customization) : undefined}
      className="group cursor-pointer bg-[var(--shop-secondary,#fff)] rounded-2xl overflow-hidden border border-[var(--shop-border,rgba(120,100,80,0.2))] transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-warm-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {product.isTrending && (
            <Badge variant="trending"><Flame size={12} /> Trending</Badge>
          )}
          {product.isNew && (
            <Badge variant="new"><Sparkles size={12} /> New</Badge>
          )}
          {product.isDeal && (
            <Badge variant="deal"><Tag size={12} /> Deal</Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onFavorite?.()
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart
            size={16}
            className={product.isFavorite ? 'fill-red-500 text-red-500' : 'text-warm-800'}
          />
        </button>

        <button
          type="button"
          aria-label={`Share ${product.name}`}
          onClick={(e) => {
            e.stopPropagation()
            void shareLink({
              title: product.name,
              text: `Check out ${product.name} on PickAmGo`,
              url: `${window.location.origin}/product/${product.id}`,
            })
          }}
          className="absolute top-12 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Share2 size={16} className="text-warm-800" />
        </button>

        {/* Discount Badge */}
        {product.discount && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="deal">-{product.discount}%</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-3" style={customization ? { color: 'var(--shop-accent)' } : undefined}>
        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-warm-200 flex-shrink-0">
            {product.seller.avatar && (
              <img
                src={product.seller.avatar}
                alt={product.seller.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
          <span className="text-xs text-warm-800/70 truncate flex-1">
            {product.seller.name}
          </span>
          {product.isVerified && (
            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
          )}
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-sm text-warm-900 line-clamp-2 mb-1.5 sm:mb-2 leading-tight">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-1.5 sm:mb-2">
          <span className="font-bold text-base sm:text-lg text-warm-900">
            GH₵{product.price}
          </span>
          {product.originalPrice && (
            <span className="text-xs sm:text-sm text-warm-800/40 line-through">
              GH₵{product.originalPrice}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-warm-800/60">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span className="truncate">{product.distance}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span>{product.rating}</span>
          </div>
        </div>

        {/* Delivery */}
        <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-xs text-warm-800/60">
          <Clock size={12} />
          <span>{product.deliveryTime}</span>
        </div>
      </div>
    </div>
  )
}
