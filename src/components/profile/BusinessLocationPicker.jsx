'use client'

import {useEffect, useId, useMemo, useRef, useState} from 'react'
import {useT} from '@/lib/i18n/useT'
import styles from './BusinessLocationPicker.module.scss'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-script'

function loadGoogleMaps(apiKey) {
  if (!apiKey || typeof window === 'undefined') return Promise.resolve(null)
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps)

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google?.maps ?? null)
    script.onerror = () => reject(new Error('GOOGLE_MAPS_LOAD_ERROR'))
    document.head.appendChild(script)
  })
}

export default function BusinessLocationPicker({
  address,
  latitude,
  longitude,
  onAddressChange,
  onLatitudeChange,
  onLongitudeChange,
}) {
  const t = useT('profileSetup')
  const inputRef = useRef(null)
  const inputId = useId()
  const [status, setStatus] = useState(() =>
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'idle' : 'fallback',
  )
  const mapQuery = useMemo(() => {
    if (address?.trim()) return encodeURIComponent(address.trim())
    if (latitude !== null && longitude !== null) return encodeURIComponent(`${latitude},${longitude}`)
    return ''
  }, [address, latitude, longitude])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || !inputRef.current) {
      return
    }

    let cancelled = false
    let mapsApi = null
    let autocomplete = null
    let placeChangedListener = null
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !maps || !inputRef.current) return
        mapsApi = maps

        autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
        })

        placeChangedListener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const nextAddress = place?.formatted_address || place?.name || ''
          const nextLat = place?.geometry?.location?.lat?.() ?? null
          const nextLng = place?.geometry?.location?.lng?.() ?? null

          if (nextAddress) onAddressChange(nextAddress)
          onLatitudeChange(nextLat)
          onLongitudeChange(nextLng)
        })

        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback')
      })

    return () => {
      cancelled = true
      if (placeChangedListener?.remove) {
        placeChangedListener.remove()
      } else if (mapsApi?.event?.removeListener && placeChangedListener) {
        mapsApi.event.removeListener(placeChangedListener)
      }
      if (autocomplete && mapsApi?.event?.clearInstanceListeners) {
        mapsApi.event.clearInstanceListeners(autocomplete)
      }
    }
  }, [onAddressChange, onLatitudeChange, onLongitudeChange])

  return (
    <div className={styles.wrap}>
      <label className={`${styles.field} ${styles.fieldFull}`} htmlFor={inputId}>
        <span>{t('businessFields.address')}</span>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder={t('businessPlaceholders.address')}
        />
      </label>

      <p className={styles.helper}>
        {status === 'ready' ? t('businessMapsReady') : t('businessMapsFallback')}
      </p>

      <label className={styles.field}>
        <span>{t('businessFields.latitude')}</span>
        <input
          type="number"
          value={latitude ?? ''}
          onChange={(event) =>
            onLatitudeChange(event.target.value === '' ? null : Number(event.target.value))
          }
          placeholder={t('businessPlaceholders.latitude')}
        />
      </label>
      <label className={styles.field}>
        <span>{t('businessFields.longitude')}</span>
        <input
          type="number"
          value={longitude ?? ''}
          onChange={(event) =>
            onLongitudeChange(event.target.value === '' ? null : Number(event.target.value))
          }
          placeholder={t('businessPlaceholders.longitude')}
        />
      </label>

      {mapQuery ? (
        <div className={styles.preview}>
          <iframe
            title={t('businessMapPreviewTitle')}
            src={`https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
    </div>
  )
}
