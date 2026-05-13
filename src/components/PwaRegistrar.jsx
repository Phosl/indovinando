'use client'

import {useEffect} from 'react'

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const registerWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (error) {
        console.error('[pwa] service worker registration failed:', error)
      }
    }

    registerWorker()
  }, [])

  return null
}
