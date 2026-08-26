'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, Share2, MapPin, Star, Clock, Calendar, Shield, ChevronLeft, MessageCircle, Minus, Plus, CheckCircle2, Flame, Sparkles } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { api } from '../../../lib/api'
import { BeautyService } from '../../../types'
import { mapApiServiceToFrontend } from '../../../lib/api-mappers'

export default function ServicePage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<BeautyService | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSummary, setBookingSummary] = useState<{ date: string; time: string; total: number } | null>(null)

  useEffect(() => {
    loadService()
  }, [params.id])

  const loadService = async () => {
    setLoading(true)
    try {
      const response = await api.get<BeautyService>(`/services/${params.id}`)
      if (response.success && response.data) {
        setService(mapApiServiceToFrontend(response.data))
      }
    } catch (err) {
      console.error('Failed to load service:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !service) return
    setBooking(true)
    setBookingError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await api.post('/bookings', {
        serviceId: service.id,
        date: selectedDate,
        timeSlot: selectedTime,
        notes: `Booking for ${service.name} on ${selectedDate} at ${selectedTime}`,
      })

      if (!response.success || !response.data) {
        setBookingError(response.error || response.message || 'Unable to create booking. Please try again.')
        return
      }

      setBookingSummary({ date: selectedDate, time: selectedTime, total: service.price })
      router.push(`/checkout?bookingId=${(response.data as any).id}&serviceId=${service.id}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(selectedTime)}`)
    } catch (err) {
      console.error('Failed to book service:', err)
      setBookingError('Booking could not be created. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading service...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-800/60 text-lg">Service not found</p>
          <Button className="mt-4" onClick={() => router.push('/')}>Go back home</Button>
        </div>
      </div>
    )
  }

  const images = [service.image, ...(service.images || [service.image])]

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Image Gallery */}
      <div className="relative aspect-square md:aspect-[4/3] bg-warm-100">
        <img
          src={images[selectedImage]}
          alt={service.name}
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
      </div>

      {/* Service Info */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {service.isTrending && <Badge variant="trending"><Flame size={12} /> Trending</Badge>}
          {service.isVerified && <Badge variant="verified"><CheckCircle2 size={12} /> Verified</Badge>}
          <Badge variant="default" className="bg-purple-100 text-purple-700">
            <Sparkles size={12} /> {service.subcategory}
          </Badge>
        </div>

        {/* Name */}
        <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-2">
          {service.name}
        </h1>

        {/* Price & Duration */}
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-3xl font-bold text-warm-900">
            GH₵{service.price}
          </span>
          {service.originalPrice && (
            <span className="text-lg text-warm-800/40 line-through">
              GH₵{service.originalPrice}
            </span>
          )}
          <div className="flex items-center gap-1 text-warm-800/60">
            <Clock size={18} />
            <span className="font-medium">{service.duration}</span>
          </div>
        </div>

        {/* Rating & Location */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-warm-800/70">
          <div className="flex items-center gap-1">
            <Star size={18} className="fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-warm-900">{service.rating}</span>
            <span>({service.reviews} reviews)</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={18} />
            <span>{service.distance} away</span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-warm-900 mb-2">About this service</h2>
          <p className="text-warm-800/70 leading-relaxed">{service.description}</p>
        </div>

        {/* Provider Info */}
        <div className="bg-white rounded-2xl p-4 border border-warm-200 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-warm-200">
              <img
                src={service.provider.avatar}
                alt={service.provider.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-warm-900">{service.provider.name}</h3>
                 {service.isVerified && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
              <p className="text-sm text-warm-800/60">{service.provider.location}</p>
            </div>
            <Button variant="outline" size="sm" icon={<MessageCircle size={16} />} onClick={() => router.push(`/messages/${service.provider.id}`)}>
              Message
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-warm-800/60">
            <div className="flex items-center gap-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span>{service.provider.rating} rating</span>
            </div>
            <span>Responds in {service.provider.responseTime}</span>
          </div>
        </div>

        {/* Booking calendar */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-warm-900 mb-3 flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            Select appointment
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-warm-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-warm-800/60 mb-2">Date</p>
              <div className="flex flex-wrap gap-2">
                {['2026-08-27','2026-08-28','2026-08-29','2026-08-30'].map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedDate === date
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-warm-50 border border-warm-200 text-warm-900 hover:border-primary/30'
                    }`}
                  >
                    {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-warm-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-warm-800/60 mb-2">Time</p>
              <div className="flex flex-wrap gap-2">
                {['09:00 AM','12:00 PM','02:00 PM','04:00 PM'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedTime === time
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-warm-50 border border-warm-200 text-warm-900 hover:border-primary/30'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {bookingSummary && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5" />
              <span>Booking selected for {bookingSummary.date} at {bookingSummary.time}. Total: GH₵{bookingSummary.total}</span>
            </div>
          )}
        </div>

        {bookingError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {bookingError}
          </div>
        )}

        {/* Reviews */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-warm-900 mb-4 flex items-center gap-2">
            <Star size={20} className="fill-yellow-400 text-yellow-400" />
            Reviews ({service.reviews})
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-warm-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div>
                  <p className="font-semibold text-warm-900">Ama K.</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-warm-800/70 text-sm">
                Amazing service! My nails look so beautiful and lasted for weeks. Highly recommend!
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 sticky bottom-4 md:relative">
          <Button
            variant="secondary"
            fullWidth
            className="flex-1"
            icon={<Heart size={18} />}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            Save
          </Button>
          <Button variant="outline" fullWidth className="flex-1" icon={<MessageCircle size={18} />}>
            Message
          </Button>
          <Button
            variant="primary"
            fullWidth
            className="flex-[2]"
            disabled={!selectedDate || !selectedTime || booking}
            onClick={handleBook}
          >
            {booking ? 'Preparing booking...' : selectedDate && selectedTime ? `Pay GH₵${service.price}` : 'Select a date and time'}
          </Button>
        </div>
      </div>
    </div>
  )
}
