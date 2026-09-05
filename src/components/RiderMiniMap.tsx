'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useJsApiLoader, GoogleMap as GoogleMapsLibMap, Marker, DirectionsRenderer } from '@react-google-maps/api'

const GOOGLE_MAPS_API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()

interface RiderMiniMapProps {
  pickup: { lat: number; lng: number }
  dropoff: { lat: number; lng: number }
  height?: string
}

const pickupIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  fillColor: '#22c55e',
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: '#ffffff',
}

const dropoffIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  fillColor: '#ef4444',
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: '#ffffff',
}

export default function RiderMiniMap({ pickup, dropoff, height = '128px' }: RiderMiniMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: `rider-mini-map-${pickup.lat}-${pickup.lng}`,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  })

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const directionsService = new google.maps.DirectionsService()
    directionsService.route(
      {
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: dropoff.lat, lng: dropoff.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result)
        }
      }
    )
  }, [isLoaded, pickup, dropoff])

  const center = {
    lat: (pickup.lat + dropoff.lat) / 2,
    lng: (pickup.lng + dropoff.lng) / 2,
  }

  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className="rounded-xl bg-warm-100 flex items-center justify-center text-sm text-warm-800/70"
        style={{ height }}
      >
        Map unavailable
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className="rounded-xl bg-warm-100 flex items-center justify-center text-sm text-warm-800/70"
        style={{ height }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden">
      <GoogleMapsLibMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={13}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
        onLoad={(map) => { mapRef.current = map }}
      >
        <Marker position={{ lat: pickup.lat, lng: pickup.lng }} icon={pickupIcon as any} />
        <Marker position={{ lat: dropoff.lat, lng: dropoff.lng }} icon={dropoffIcon as any} />
        {directions && (
          <DirectionsRenderer
            options={{
              directions,
              polylineOptions: { strokeColor: '#FF6B35', strokeWeight: 4, strokeOpacity: 0.8 },
              suppressMarkers: true,
            }}
          />
        )}
      </GoogleMapsLibMap>
    </div>
  )
}
