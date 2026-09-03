'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useJsApiLoader, GoogleMap as GoogleMapsLibMap, Marker, DirectionsRenderer } from '@react-google-maps/api'
import { useTheme } from '../theme/ThemeProvider'

type Coordinate = { latitude: number; longitude: number }
type MapMarker = Coordinate & { label: string; color?: string }

interface PickAmGoMapProps {
  markers: MapMarker[]
  route?: { from: Coordinate; to: Coordinate }
  height?: string
  showCurrentLocation?: boolean
  onCurrentLocation?: (location: Coordinate) => void
  onRouteInfo?: (info: { distance: string; duration: string }) => void
}

const GOOGLE_MAPS_API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
const GHANA_CENTER: Coordinate = { latitude: 5.6037, longitude: -0.187 }

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
}

export default function GoogleMap({
  markers,
  route,
  height = '320px',
  showCurrentLocation = false,
  onCurrentLocation,
  onRouteInfo,
}: PickAmGoMapProps) {
  const { theme } = useTheme()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const routeInfoRef = useRef(onRouteInfo)
  routeInfoRef.current = onRouteInfo

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRefs = useRef<google.maps.Marker[]>([])

  const isDark = theme === 'dark'
  const mapStyles = isDark ? [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
    { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255f77' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
    { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#255f77' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
  ] : []

  const markerIcon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>')}`,
    scaledSize: new google.maps.Size(24, 24),
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setLoading(false)
    setMapReady(true)
  }, [])

  useEffect(() => {
    if (loadError) {
      console.error('Google Maps JavaScript API failed to load:', loadError)
      setError('Failed to load Google Maps. Please check your API key or network connection.')
      setLoading(false)
    }
  }, [loadError])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRefs.current.forEach(marker => marker.setMap(null))
    markerRefs.current = markers.map(markerData => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.latitude, lng: markerData.longitude },
        map,
        title: markerData.label,
        icon: markerIcon,
      })
      const infoWindow = new google.maps.InfoWindow({ content: `<div style="font-size:13px;font-weight:500;">${markerData.label}</div>` })
      marker.addListener('click', () => infoWindow.open(map, marker))
      return marker
    })

    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      markers.forEach(marker => bounds.extend({ lat: marker.latitude, lng: marker.longitude }))
      map.fitBounds(bounds, 56)
    } else if (markers.length === 1) {
      map.panTo({ lat: markers[0].latitude, lng: markers[0].longitude })
      map.setZoom(14)
    }
  }, [markers, mapReady, markerIcon])

  useEffect(() => {
    if (!route || !isLoaded || !mapRef.current) return
    const directionsService = new google.maps.DirectionsService()
    directionsService.route(
      {
        origin: { lat: route.from.latitude, lng: route.from.longitude },
        destination: { lat: route.to.latitude, lng: route.to.longitude },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result)
          const leg = result.routes[0]?.legs[0]
          if (leg) {
            routeInfoRef.current?.({
              distance: `${(leg.distance?.value || 0) / 1000} km`,
              duration: `${Math.ceil((leg.duration?.value || 0) / 60)} min`,
            })
          }
        } else {
          setError('Route is currently unavailable. Showing locations without directions.')
        }
      }
    )
  }, [route, isLoaded])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Current location is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        mapRef.current?.panTo({ lat: location.latitude, lng: location.longitude })
        mapRef.current?.setZoom(15)
        onCurrentLocation?.(location)
      },
      () => setError('Location permission was denied. The delivery map still works without it.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (loadError) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-600">Failed to load Google Maps. Please check your API key.</p>
        <div className="relative overflow-hidden rounded-xl border border-warm-200 bg-warm-100" style={{ height }}>
          <div className="flex items-center justify-center h-full text-sm text-warm-800/70">Map unavailable</div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        {showCurrentLocation && (
          <button type="button" onClick={useCurrentLocation} className="text-sm text-primary font-medium hover:text-primary-dark">
            Use My Current Location
          </button>
        )}
        <div className="relative overflow-hidden rounded-xl border border-warm-200 bg-warm-100" style={{ height }}>
          <div className="flex items-center justify-center h-full text-sm text-warm-800/70">Loading map...</div>
        </div>
      </div>
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
        <GoogleMapsLibMap
          mapContainerStyle={mapContainerStyle}
          center={markers[0] ? { lat: markers[0].latitude, lng: markers[0].longitude } : { lat: GHANA_CENTER.latitude, lng: GHANA_CENTER.longitude }}
          zoom={markers.length ? 13 : 11}
          options={{
            styles: isDark ? mapStyles : undefined,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
          onLoad={onMapLoad}
        >
          {markers.map((markerData, index) => (
            <Marker
              key={index}
              position={{ lat: markerData.latitude, lng: markerData.longitude }}
              title={markerData.label}
              icon={markerIcon}
            />
          ))}
          {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: '#FF6B35', strokeWeight: 5, strokeOpacity: 0.85 } }} />}
        </GoogleMapsLibMap>
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-warm-100/80 text-sm text-warm-800/70">Loading map...</div>}
      </div>
    </div>
  )
}

export type { Coordinate, MapMarker }
