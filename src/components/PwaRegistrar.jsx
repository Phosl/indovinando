'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import styles from './PwaRegistrar.module.scss'

const UPDATE_COPY = {
  it: {
    title: 'Nuova versione disponibile',
    message: 'Aggiorna quando sei pronto.',
    refresh: 'Aggiorna',
    dismiss: 'Più tardi',
  },
  en: {
    title: 'New version available',
    message: 'Update when you are ready.',
    refresh: 'Update',
    dismiss: 'Later',
  },
}

function getUpdateCopy() {
  if (typeof document === 'undefined') return UPDATE_COPY.it
  const lang = document.documentElement.lang || navigator.language || 'it'
  return lang.toLowerCase().startsWith('en') ? UPDATE_COPY.en : UPDATE_COPY.it
}

export default function PwaRegistrar() {
  const waitingWorkerRef = useRef(null)
  const isRefreshingRef = useRef(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const copy = getUpdateCopy()

  const showUpdatePrompt = useCallback((worker) => {
    waitingWorkerRef.current = worker
    setUpdateAvailable(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0'

    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {})
      return
    }

    const handleControllerChange = () => {
      if (!isRefreshingRef.current) return
      window.location.reload()
    }

    const registerWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdatePrompt(registration.waiting)
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state !== 'installed') return
            if (!navigator.serviceWorker.controller) return
            showUpdatePrompt(installingWorker)
          })
        })
      } catch (error) {
        console.error('[pwa] service worker registration failed:', error)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    registerWorker()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [showUpdatePrompt])

  const handleRefresh = () => {
    const waitingWorker = waitingWorkerRef.current
    if (!waitingWorker) {
      window.location.reload()
      return
    }

    isRefreshingRef.current = true
    waitingWorker.postMessage({type: 'SKIP_WAITING'})
  }

  if (!updateAvailable) return null

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      <div className={styles.banner}>
        <div className={styles.text}>
          <strong>{copy.title}</strong>
          <span>{copy.message}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={() => setUpdateAvailable(false)}>
            {copy.dismiss}
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleRefresh}>
            {copy.refresh}
          </button>
        </div>
      </div>
    </div>
  )
}
