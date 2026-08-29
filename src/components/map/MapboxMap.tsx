'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'

type Coordinate = { latitude: number; longitude: number }
type MapMarker = Coordinate & { label: string; color?: string }

interface MapboxMapProps {
  markers: MapMarker[]
  route?: { from: Coordinate; to: Coordinate }
  height?: string
  showCurrentLocation?: boolean
  onCurrentLocation?: (location: Coordinate) => void
  onRouteInfo?: (info: { distance: string; duration: string }) => void
}

declare global {
  interface Window { mapboxgl: any }
}

const LIGHT_STYLE = 'mapbox://styles/mapbox/streets-v12'
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11'
const MAPBOX_ACCESS_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim()

export default function MapboxMap({ markers, route, height = '320px', showCurrentLocation = false, onCurrentLocation, onRouteInfo }: MapboxMapProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRefs = useRef<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const routeInfoRef = useRef(onRouteInfo)
  routeInfoRef.current = onRouteInfo
  const token = MAPBOX_ACCESS_TOKEN

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      if (!token) {
        setError('Mapbox is not configured in this environment. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.')
        setLoading(false)
        return
      }
      try {
        const mapbox = await import('mapbox-gl')
        if (cancelled || !containerRef.current) return
        mapbox.default.accessToken = token
        window.mapboxgl = mapbox.default
        const map = new mapbox.default.Map({
          container: containerRef.current,
          style: theme === 'dark' ? DARK_STYLE : LIGHT_STYLE,
          center: markers[0] ? [markers[0].longitude, markers[0].latitude] : [-0.187, 5.6037],
          zoom: markers.length ? 13 : 11,
        })
        map.addControl(new mapbox.default.NavigationControl(), 'top-right')
        if (showCurrentLocation) {
          const geolocate = new mapbox.default.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false,
            showUserHeading: true,
          })
          map.addControl(geolocate, 'top-right')
          geolocate.on('geolocate', (event: any) => {
            onCurrentLocation?.({ latitude: event.coords.latitude, longitude: event.coords.longitude })
          })
        }
        map.on('load', () => {
          if (!cancelled) {
            setLoading(false)
            setMapReady(true)
          }
        })
        map.on('error', () => {
          if (!cancelled) setError('Map could not be loaded. Check the Mapbox token or network connection.')
        })
        mapRef.current = map
      } catch {
        if (!cancelled) {
          setError('Map could not be loaded. Please try again later.')
          setLoading(false)
        }
      }
    }
    initialize()
    return () => {
      cancelled = true
      markerRefs.current.forEach(marker => marker.remove())
      markerRefs.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(theme === 'dark' ? DARK_STYLE : LIGHT_STYLE)
  }, [theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRefs.current.forEach(marker => marker.remove())
    markerRefs.current = markers.map(markerData => {
      const marker = new window.mapboxgl.Marker({ color: markerData.color || '#FF6B35' })
        .setLngLat([markerData.longitude, markerData.latitude])
        .setPopup(new window.mapboxgl.Popup({ offset: 24 }).setText(markerData.label))
        .addTo(map)
      return marker
    })

    if (markers.length > 1) {
      const bounds = new window.mapboxgl.LngLatBounds()
      markers.forEach(marker => bounds.extend([marker.longitude, marker.latitude]))
      map.fitBounds(bounds, { padding: 56, maxZoom: 15 })
    } else if (markers[0]) {
      map.flyTo({ center: [markers[0].longitude, markers[0].latitude], zoom: 14 })
    }
  }, [markers, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !route || !token) return
    let cancelled = false
    const loadRoute = async () => {
      try {
        const coordinates = `${route.from.longitude},${route.from.latitude};${route.to.longitude},${route.to.latitude}`
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${token}`)
        const data = await response.json()
        const geometry = data.routes?.[0]?.geometry
        if (cancelled || !geometry) {
          if (!cancelled) setError('Route is currently unavailable. Showing locations without directions.')
          return
        }
        const selectedRoute = data.routes[0]
        routeInfoRef.current?.({
          distance: `${(selectedRoute.distance / 1000).toFixed(1)} km`,
          duration: `${Math.ceil(selectedRoute.duration / 60)} min`,
        })
        const addRoute = () => {
          if (map.getSource('delivery-route')) map.removeSource('delivery-route')
          if (map.getLayer('delivery-route-line')) map.removeLayer('delivery-route-line')
          map.addSource('delivery-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } })
          map.addLayer({ id: 'delivery-route-line', type: 'line', source: 'delivery-route', paint: { 'line-color': '#FF6B35', 'line-width': 5, 'line-opacity': 0.85 } })
        }
        if (map.isStyleLoaded()) addRoute()
        else map.once('style.load', addRoute)
      } catch {
        if (!cancelled) setError('Route could not be loaded. Showing locations without directions.')
      }
    }
    loadRoute()
    return () => { cancelled = true }
  }, [route, token, theme, mapReady])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Current location is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        mapRef.current?.flyTo({ center: [location.longitude, location.latitude], zoom: 15 })
        onCurrentLocation?.(location)
      },
      () => setError('Location permission was denied. The delivery map still works without it.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-2">
      {showCurrentLocation && (
        <button type="button" onClick={useCurrentLocation} className="text-sm text-primary font-medium hover:text-primary-dark">
          Use My Current Location
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="relative overflow-hidden rounded-xl border border-warm-200 bg-warm-100" style={{ height }}>
        <div ref={containerRef} className="h-full w-full" />
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-warm-100/80 text-sm text-warm-800/70">Loading map...</div>}
      </div>
    </div>
  )
}

export type { Coordinate, MapMarker }
