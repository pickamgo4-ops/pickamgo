import React from 'react'
import { Heart, MapPin, Star, Clock, Calendar, Flame, CheckCircle2, Sparkles } from 'lucide-react'
import { BeautyService } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { shopCustomizationStyle } from '../../lib/shop-themes'

interface BeautyCardProps {
  service: BeautyService
  onClick?: () => void
  onFavorite?: () => void
}

export function BeautyCard({ service, onClick, onFavorite }: BeautyCardProps) {
  const customization = service.shop?.customization
  return (
    <div
      onClick={onClick}
      style={customization ? shopCustomizationStyle(customization) : undefined}
      className="group cursor-pointer bg-[var(--shop-secondary,#fff)] rounded-2xl overflow-hidden border border-[var(--shop-border,rgba(120,100,80,0.2))] transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-warm-100">
        <img
          src={service.image}
          alt={service.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {service.isTrending && (
            <Badge variant="trending"><Flame size={12} /> Trending</Badge>
          )}
          <Badge variant="verified"><CheckCircle2 size={12} /> Verified</Badge>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onFavorite?.()
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart
            size={16}
            className={service.isFavorite ? 'fill-red-500 text-red-500' : 'text-warm-800'}
          />
        </button>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
          <Badge variant="default" className="bg-white/20 text-white border-0">
            <Sparkles size={12} /> {service.subcategory}
          </Badge>
          </div>
          <h3 className="font-bold text-lg leading-tight mb-1">
            {service.name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-white/90">
            <div className="flex items-center gap-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{service.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{service.distance}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{service.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4" style={customization ? { color: 'var(--shop-accent)' } : undefined}>
        {/* Provider */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-warm-200">
            {service.provider.avatar && (
              <img
                src={service.provider.avatar}
                alt={service.provider.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <span className="text-sm font-medium text-warm-900">
            {service.provider.name}
          </span>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-warm-800/60">From</span>
            <p className="font-bold text-xl text-warm-900">
              GH₵{service.price}
            </p>
          </div>
          <button className="text-sm font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-1.5" style={customization ? { backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-text)' } : undefined}>
            <Calendar size={16} />
            Book
          </button>
        </div>

        {/* Availability */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {service.availability.slice(0, 2).map((time, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-lg" style={customization ? { backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-text)' } : undefined}
            >
              {time}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
