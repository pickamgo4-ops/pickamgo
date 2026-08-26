'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

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
    MapboxGeocoder: any
  }
}

export default function MapboxLocationPicker({
  value,
  onChange,
  placeholder = 'Search address in Ghana',
  height = '320px',
  GhanaCentric = true,
}: MapboxLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [searchValue, setSearchValue] = useState(value?.address || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultCenter = GhanaCentric ? [ -0.187, 5.6037 ] : [ -0.187, 5.6037 ]
  const defaultZoom = GhanaCentric ? 12 : 13

  const initMap = useCallback(() => {
    if (!mapContainer.current || typeof window === 'undefined' || !window.mapboxgl) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token) {
      setError('Mapbox token is missing. Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables.')
      return
    }

    window.mapboxgl.accessToken = token

    const map = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: value?.longitude && value?.latitude ? [value.longitude, value.latitude] : defaultCenter,
      zoom: value?.longitude && value?.latitude ? 15 : defaultZoom,
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
  }, [defaultCenter, defaultZoom, value])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadMapbox = async () => {
      setLoading(true)
      setError('')

      try {
        if (!window.mapboxgl) {
          await import('mapbox-gl')
          await import('@mapbox/mapbox-gl-geocoder')
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

  const reverseGeocode = async (lat: number, lng: number) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token) return

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&country=gh`
      )
      const data = await res.json()
      const place = data.features?.[0]
      if (place) {
        const address = place.place_name || place.text || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        setSearchValue(address)
        onChange({ address, latitude: lat, longitude: lng })
      }
    } catch (err) {
      console.error('Reverse geocode failed:', err)
    }
  }

  const forwardGeocode = async (query: string) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token || !query.trim()) return

    setLoading(true)
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&country=gh&proximity=${defaultCenter[0]},${defaultCenter[1]}`
      )
      const data = await res.json()
      const places = data.features || []

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
        setError('Location permission denied. Please enable location access or search manually.')
        setLoading(false)
        console.error('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (value?.address && mapReady && value.latitude && value.longitude) {
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [value.longitude, value.latitude], zoom: 15 })
        placeMarker(value.latitude, value.longitude)
      }
      setSearchValue(value.address)
    }
  }, [value, mapReady])

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && forwardGeocode(searchValue)}
          placeholder={placeholder}
          className="flex-1 bg-white border border-warm-200 rounded-xl py-3 px-4 text-sm text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <button
          type="button"
          onClick={() => forwardGeocode(searchValue)}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
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

      {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
        <p className="text-xs text-red-600">
          Mapbox token is missing. Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables.
        </p>
      )}
    </div>
  )
}
