'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from '../theme/ThemeProvider'

interface MapboxLocationPickerProps {
  value?: { address?: string; latitude?: number; longitude?: number } | null
  onChange: (result: { address: string; latitude: number; longitude: number }) => void
  placeholder?: string
  height?: string
  GhanaCentric?: boolean
}

declare global {
  interface Window {
    mapboxgl: any
  }
}

const GHANA_CENTER: [number, number] = [-0.187, 5.6037]
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export default function MapboxLocationPicker({
  value,
  onChange,
  placeholder = 'Search address in Ghana',
  height = '320px',
  GhanaCentric = true,
}: MapboxLocationPickerProps) {
  const { theme } = useTheme()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [searchValue, setSearchValue] = useState(value?.address || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionRequestRef = useRef<AbortController | null>(null)
  const searchQueryRef = useRef(searchValue)
  const proximityRef = useRef<[number, number] | null>(
    value?.longitude != null && value?.latitude != null ? [value.longitude, value.latitude] : null
  )

  const defaultCenter = GHANA_CENTER
  const defaultZoom = GhanaCentric ? 12 : 13
  const themeRef = useRef(theme)
  themeRef.current = theme

  const initMap = useCallback(() => {
    if (!mapContainer.current || typeof window === 'undefined' || !window.mapboxgl) return

    const token = MAPBOX_ACCESS_TOKEN

    window.mapboxgl.accessToken = token

    const map = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: themeRef.current === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: value?.longitude != null && value?.latitude != null ? [value.longitude, value.latitude] : defaultCenter,
      zoom: value?.longitude != null && value?.latitude != null ? 15 : defaultZoom,
    })

    map.addControl(new window.mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      setMapReady(true)
    })

    map.on('click', (e: any) => {
      const { lng, lat } = e.lngLat
      placeMarker(lat, lng)
      reverseGeocode(lat, lng)
    })

    mapRef.current = map
  }, [defaultCenter, defaultZoom])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadMapbox = async () => {
      setLoading(true)
      setError('')

      try {
        if (!window.mapboxgl) {
          const mapbox = await import('mapbox-gl')
          window.mapboxgl = mapbox.default
        }

        if (!document.getElementById('mapbox-css')) {
          const link = document.createElement('link')
          link.id = 'mapbox-css'
          link.rel = 'stylesheet'
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css'
          document.head.appendChild(link)
        }

        if (!document.getElementById('mapbox-geocoder-css')) {
          const link = document.createElement('link')
          link.id = 'mapbox-geocoder-css'
          link.rel = 'stylesheet'
          link.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css'
          document.head.appendChild(link)
        }

        initMap()
      } catch (err) {
        setError('Failed to load Mapbox. Please check your connection and try again.')
        console.error('Mapbox load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMapbox()

    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
      suggestionRequestRef.current?.abort()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }
  }, [initMap])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        proximityRef.current = [coords.longitude, coords.latitude]
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  const placeMarker = (lat: number, lng: number) => {
    if (!mapRef.current) return

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      markerRef.current = new window.mapboxgl.Marker({ color: '#FF6B35' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current)
    }
  }

  const formatPlaceName = (feature: any, fallback = 'Location selected') => {
    if (!feature) return fallback
    if (feature.place_name) return feature.place_name

    const context = Array.isArray(feature.context)
      ? feature.context.map((item: any) => item.text).filter(Boolean)
      : []
    return [feature.text, ...context].filter(Boolean).join(', ') || fallback
  }

  const rankReverseGeocodeFeature = (feature: any) => {
    const type = feature?.place_type?.[0]
    const priority: Record<string, number> = {
      address: 6,
      poi: 5,
      street: 4,
      neighborhood: 3,
      locality: 2,
      place: 2,
      district: 1,
      region: 1,
      country: 0,
    }
    return priority[type] ?? -1
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    const token = MAPBOX_ACCESS_TOKEN
    const fallbackAddress = 'Location selected'
    if (!token) {
      setError('Address could not be determined. Please check your map configuration or try again.')
      onChange({ address: fallbackAddress, latitude: lat, longitude: lng })
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(token)}&limit=10&country=GH&language=en&autocomplete=false`
      )
      if (!res.ok) throw new Error(`Mapbox reverse geocoding failed with ${res.status}`)
      const data = await res.json()
      const place = [...(data.features || [])].sort(
        (first: any, second: any) => rankReverseGeocodeFeature(second) - rankReverseGeocodeFeature(first)
      )[0]
      const address = formatPlaceName(place, fallbackAddress)
      setSearchValue(address)
      onChange({ address, latitude: lat, longitude: lng })
    } catch (err) {
      console.error('Reverse geocode failed:', err)
      setSearchValue(fallbackAddress)
      setError('Address could not be determined. Please try selecting the location again.')
      onChange({ address: fallbackAddress, latitude: lat, longitude: lng })
    } finally {
      setLoading(false)
    }
  }

  const searchPlaces = async (query: string, limit: number, signal?: AbortSignal) => {
    const token = MAPBOX_ACCESS_TOKEN
    if (!token) return []
    const params = new URLSearchParams({
      access_token: token,
      autocomplete: 'true',
      country: 'GH',
      language: 'en',
      limit: String(limit),
      types: 'address,street,poi,building,neighborhood,locality,place,district',
    })
    const proximity = proximityRef.current
    if (proximity) params.set('proximity', `${proximity[0]},${proximity[1]}`)

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`,
      { signal }
    )
    if (!response.ok) throw new Error(`Mapbox search failed with ${response.status}`)
    const data = await response.json()
    return Array.isArray(data.features) ? data.features : []
  }

  const forwardGeocode = async (query: string) => {
    const token = MAPBOX_ACCESS_TOKEN
    if (!token || !query.trim()) return

    setLoading(true)
    try {
      const places = await searchPlaces(query, 5)

      if (places.length === 0) {
        setError('No results found. Try a different address.')
        return
      }

      const place = places[0]
      const [lng, lat] = place.center
      const address = place.place_name || place.text || query

      setSearchValue(address)
      onChange({ address, latitude: lat, longitude: lng })

      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 15 })
        placeMarker(lat, lng)
      }
      setError('')
    } catch (err) {
      setError('Address search failed. Please try again.')
      console.error('Geocode error:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectSuggestion = (place: any) => {
    const [lng, lat] = place.center
    const address = place.place_name || place.text
    setSearchValue(address)
    setSuggestions([])
    onChange({ address, latitude: lat, longitude: lng })
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15 })
    placeMarker(lat, lng)
    setError('')
  }

  const handleSearchChange = (query: string) => {
    setSearchValue(query)
    searchQueryRef.current = query
    setSuggestions([])
    setError('')
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    suggestionRequestRef.current?.abort()
    const token = MAPBOX_ACCESS_TOKEN
    const cleanQuery = query.trim()
    if (!token || cleanQuery.length < 3) return
    suggestionTimerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      suggestionRequestRef.current = controller
      setLoading(true)
      try {
        const results = await searchPlaces(cleanQuery, 5, controller.signal)
        if (!controller.signal.aborted && searchQueryRef.current.trim() === cleanQuery) {
          setSuggestions(results)
          if (results.length === 0) setError('No Ghanaian places found. Try a nearby street, landmark, or area.')
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setSuggestions([])
          setError('Address search failed. Please try again.')
          console.error('Autocomplete error:', err)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15 })
          placeMarker(latitude, longitude)
        }
        await reverseGeocode(latitude, longitude)
        setLoading(false)
      },
      (err) => {
        let message = 'Unable to get your location.'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission was denied. Enable location access in your browser or address bar settings, then try again.'
            break
          case err.POSITION_UNAVAILABLE:
            message = 'Location is unavailable. Try searching manually instead.'
            break
          case err.TIMEOUT:
            message = 'Location request timed out. Please try again or search manually.'
            break
        }
        setError(message)
        setLoading(false)
        console.error('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (value?.address && mapReady && value.latitude != null && value.longitude != null) {
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [value.longitude, value.latitude], zoom: 15 })
        placeMarker(value.latitude, value.longitude)
      }
      setSearchValue(value.address)
    }
  }, [value, mapReady])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12')
    }
  }, [theme])

  return (
    <div className="w-full space-y-3">
      <div className="relative flex gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && forwardGeocode(searchValue)}
          placeholder={placeholder}
          className="flex-1 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-700 rounded-xl py-3 px-4 text-sm text-warm-900 dark:text-white placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <button
          type="button"
          onClick={() => forwardGeocode(searchValue)}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-20 top-full z-20 mt-1 overflow-hidden rounded-xl border border-warm-200 bg-white shadow-lg dark:border-warm-700 dark:bg-warm-900">
            {suggestions.map((place) => (
              <button key={place.id} type="button" onClick={() => selectSuggestion(place)} className="block w-full px-4 py-3 text-left text-sm text-warm-900 hover:bg-warm-100 dark:text-white dark:hover:bg-warm-800">
                {place.place_name || place.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={loading}
          className="text-sm text-primary font-medium hover:text-primary-dark disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? 'Locating...' : 'Use my current location'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <div
        ref={mapContainer}
        style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
        className="border border-warm-200"
      />

    </div>
  )
}
