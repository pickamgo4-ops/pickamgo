'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { useTheme } from '../theme/ThemeProvider'
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react'

interface GoogleLocationPickerProps {
  value?: { address?: string; latitude?: number; longitude?: number } | null
  onChange: (result: { address: string; latitude: number; longitude: number }) => void
  placeholder?: string
  height?: string
  GhanaCentric?: boolean
}

const GOOGLE_MAPS_API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
const GHANA_CENTER: { lat: number; lng: number } = { lat: 5.6037, lng: -0.187 }

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
}

export default function GoogleLocationPicker({
  value,
  onChange,
  placeholder = 'Search address in Ghana',
  height = '320px',
  GhanaCentric = true,
}: GoogleLocationPickerProps) {
  const { theme } = useTheme()
  const [mapReady, setMapReady] = useState(false)
  const [searchValue, setSearchValue] = useState(value?.address || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    value?.latitude != null && value?.longitude != null ? { lat: value.latitude, lng: value.longitude } : null
  )
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const proximityRef = useRef<{ lat: number; lng: number } | null>(null)

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

  const { isLoaded, loadError: mapsLoadError } = useJsApiLoader({
    id: 'google-location-picker-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  })

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMapReady(true)
  }, [])

  useEffect(() => {
    if (mapsLoadError) {
      setError('Failed to load Google Maps. Please check your API key or network connection.')
    }
  }, [mapsLoadError])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        proximityRef.current = { lat: coords.latitude, lng: coords.longitude }
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!window.google || !mapRef.current) return
    setLoading(true)
    setError('')
    try {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const address = results[0].formatted_address
            setSearchValue(address)
            onChange({ address, latitude: lat, longitude: lng })
          } else {
            const fallback = 'Location selected'
            setSearchValue(fallback)
            onChange({ address: fallback, latitude: lat, longitude: lng })
          }
          setLoading(false)
        }
      )
    } catch {
      setError('Address could not be determined. Please try selecting the location again.')
      setLoading(false)
    }
  }, [onChange])

  const handleSearchChange = (query: string) => {
    setSearchValue(query)
    setShowSuggestions(false)
    setError('')

    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    if (!query.trim() || query.length < 3) {
      setSuggestions([])
      return
    }

    suggestionTimerRef.current = setTimeout(() => {
      if (!window.google) return
      const placesService = new google.maps.places.AutocompleteService()
      placesService.getPlacePredictions(
        {
          input: query,
          componentRestrictions: GhanaCentric ? { country: 'gh' } : undefined,
          location: proximityRef.current ? new google.maps.LatLng(proximityRef.current.lat, proximityRef.current.lng) : undefined,
          radius: 50000,
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions)
            setShowSuggestions(true)
          } else {
            setSuggestions([])
          }
        }
      )
    }, 300)
  }

  const selectSuggestion = (place: google.maps.places.AutocompletePrediction) => {
    if (!mapRef.current || !place.place_id) return
    setShowSuggestions(false)
    const placesService = new google.maps.places.PlacesService(mapRef.current)
    placesService.getDetails({ placeId: place.place_id }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
        const lat = result.geometry.location.lat()
        const lng = result.geometry.location.lng()
        const address = result.formatted_address || place.description || ''
        setSearchValue(address)
        setMarkerPosition({ lat, lng })
        onChange({ address, latitude: lat, longitude: lng })
        mapRef.current?.panTo({ lat, lng })
        mapRef.current?.setZoom(15)
      }
    })
  }

  const handleSearchSubmit = () => {
    if (!autocompleteRef.current) return
    const place = autocompleteRef.current.getPlace()
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const address = place.formatted_address || searchValue
      setSearchValue(address)
      setMarkerPosition({ lat, lng })
      onChange({ address, latitude: lat, longitude: lng })
      mapRef.current?.panTo({ lat, lng })
      mapRef.current?.setZoom(15)
      setShowSuggestions(false)
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
          mapRef.current.panTo({ lat: latitude, lng: longitude })
          mapRef.current.setZoom(15)
          setMarkerPosition({ lat: latitude, lng: longitude })
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
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (value?.address && mapReady && value.latitude != null && value.longitude != null) {
      if (mapRef.current) {
        mapRef.current.panTo({ lat: value.latitude, lng: value.longitude })
        mapRef.current.setZoom(15)
        setMarkerPosition({ lat: value.latitude, lng: value.longitude })
      }
      setSearchValue(value.address)
    }
  }, [value, mapReady])

  const markerIcon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>')}`,
    scaledSize: new google.maps.Size(24, 24),
  }

  if (mapsLoadError) {
    return (
      <div className="w-full space-y-3">
        <div className="relative flex gap-2">
          <input
            type="text"
            value={searchValue}
            readOnly
            placeholder={placeholder}
            className="flex-1 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-700 rounded-xl py-3 px-4 text-sm text-warm-900 dark:text-white placeholder:text-warm-800/40"
          />
        </div>
        <p className="text-xs text-red-600">Google Maps failed to load. Please check your API key or network connection.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full space-y-3">
        <div className="relative flex gap-2">
          <div className="flex-1 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-700 rounded-xl py-3 px-4 text-sm text-warm-800/40">
            Loading map...
          </div>
        </div>
        <div style={{ height }} className="border border-warm-200 rounded-xl bg-warm-100 flex items-center justify-center text-sm text-warm-800/70">
          Loading Google Maps...
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-3">
      <div className="relative flex gap-2">
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete
          }}
          onPlaceChanged={handleSearchSubmit}
          options={{ componentRestrictions: GhanaCentric ? { country: 'gh' } : undefined }}
        >
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="flex-1 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-700 rounded-xl py-3 px-4 text-sm text-warm-900 dark:text-white placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </Autocomplete>
        <button
          type="button"
          onClick={handleSearchSubmit}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          <span className="hidden sm:inline">{loading ? 'Searching...' : 'Search'}</span>
        </button>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-20 top-full z-20 mt-1 overflow-hidden rounded-xl border border-warm-200 bg-white shadow-lg dark:border-warm-700 dark:bg-warm-900 max-h-60 overflow-y-auto">
            {suggestions.map((place) => (
              <button
                key={place.place_id}
                type="button"
                onMouseDown={() => selectSuggestion(place)}
                className="block w-full px-4 py-3 text-left text-sm text-warm-900 hover:bg-warm-100 dark:text-white dark:hover:bg-warm-800"
              >
                {place.description}
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
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
          {loading ? 'Locating...' : 'Use my current location'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <div style={{ height, width: '100%' }} className="border border-warm-200 rounded-xl overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={markerPosition || GHANA_CENTER}
          zoom={markerPosition ? 15 : GhanaCentric ? 12 : 13}
          options={{
            styles: isDark ? mapStyles : undefined,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
          onLoad={onMapLoad}
          onClick={(e) => {
            if (e.latLng) {
              const lat = e.latLng.lat()
              const lng = e.latLng.lng()
              setMarkerPosition({ lat, lng })
              reverseGeocode(lat, lng)
            }
          }}
        >
          {markerPosition && (
            <Marker position={markerPosition} icon={markerIcon} />
          )}
        </GoogleMap>
      </div>
    </div>
  )
}
