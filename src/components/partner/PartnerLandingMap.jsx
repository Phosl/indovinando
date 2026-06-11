'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-script'

function loadGoogleMaps(apiKey) {
  if (!apiKey || typeof window === 'undefined') return Promise.resolve(null)
  if (window.google?.maps) return Promise.resolve(window.google.maps)

  const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.google?.maps ?? null), {once: true})
      existing.addEventListener('error', () => reject(new Error('GOOGLE_MAPS_LOAD_ERROR')), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google?.maps ?? null)
    script.onerror = () => reject(new Error('GOOGLE_MAPS_LOAD_ERROR'))
    document.head.appendChild(script)
  })
}

export default function PartnerLandingMap({partners = [], className = ''}) {
  const mapRef = useRef(null)
  const [ready, setReady] = useState(false)
  const mapPartners = useMemo(
    () => partners.filter((partner) => Number.isFinite(partner?.latitude) && Number.isFinite(partner?.longitude)),
    [partners],
  )

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || !mapRef.current || mapPartners.length === 0) return

    let cancelled = false
    let map = null
    let mapsApi = null
    const markers = []
    const infoWindows = []
    const markerListeners = []

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !maps || !mapRef.current) return
        mapsApi = maps

        const defaultCenter = {
          lat: mapPartners[0].latitude,
          lng: mapPartners[0].longitude,
        }

        map = new maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: mapPartners.length > 1 ? 5 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
        })

        const bounds = new maps.LatLngBounds()

        mapPartners.forEach((partner) => {
          const position = {
            lat: partner.latitude,
            lng: partner.longitude,
          }

          const marker = new maps.Marker({
            position,
            map,
            title: partner.name,
          })
          markers.push(marker)

          const infoWindow = new maps.InfoWindow({
            content: `
              <div style="min-width:160px;padding:4px 2px;font-family:Arial,sans-serif;">
                <strong style="display:block;margin-bottom:4px;color:var(--primary-900);">${partner.name}</strong>
                <div style="font-size:12px;color:var(--text-secondary);">${partner.category || ''}</div>
                ${partner.location ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${partner.location}</div>` : ''}
              </div>
            `,
          })
          infoWindows.push(infoWindow)

          const clickListener = marker.addListener('click', () => infoWindow.open({anchor: marker, map}))
          markerListeners.push(clickListener)
          bounds.extend(position)
        })

        if (mapPartners.length > 1) {
          map.fitBounds(bounds, 72)
        } else {
          map.setCenter(defaultCenter)
        }

        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
      markerListeners.forEach((listener) => {
        if (listener?.remove) {
          listener.remove()
        } else if (mapsApi?.event?.removeListener) {
          mapsApi.event.removeListener(listener)
        }
      })
      infoWindows.forEach((infoWindow) => infoWindow?.close?.())
      markers.forEach((marker) => {
        if (mapsApi?.event?.clearInstanceListeners) {
          mapsApi.event.clearInstanceListeners(marker)
        }
        marker?.setMap?.(null)
      })
      if (map && mapsApi?.event?.clearInstanceListeners) {
        mapsApi.event.clearInstanceListeners(map)
      }
    }
  }, [mapPartners])

  return (
    <div className={className}>
      <div ref={mapRef} style={{width: '100%', height: '100%'}} />
      {!ready && mapPartners.length > 0 ? <div style={{display: 'none'}} aria-hidden="true" /> : null}
    </div>
  )
}
