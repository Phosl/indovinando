'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {usePathname} from 'next/navigation'

const AppDataContext = createContext(null)

const APP_DATA_PATH_PREFIXES = [
  '/dashboard',
  '/profilo',
  '/miei-giochi',
  '/corso-vino',
  '/game',
  '/classifiche',
]

function shouldLoadAppData(pathname = '') {
  return APP_DATA_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function AppDataProvider({children}) {
  const pathname = usePathname()
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)
  const inFlightRef = useRef(null)
  const canLoad = shouldLoadAppData(pathname)

  const refresh = useCallback(async ({force = false} = {}) => {
    if (inFlightRef.current) return inFlightRef.current
    if (hasLoadedRef.current && !force) return snapshot

    const request = (async () => {
      setStatus(snapshot ? 'refreshing' : 'loading')
      setError(null)

      try {
        const response = await fetch('/api/app-data', {
          cache: 'no-store',
          headers: {'Accept': 'application/json'},
        })

        if (response.status === 401) {
          hasLoadedRef.current = true
          setSnapshot(null)
          setStatus('unauthenticated')
          return null
        }

        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload) {
          throw new Error(payload?.error || 'Unable to load app data')
        }

        hasLoadedRef.current = true
        setSnapshot(payload)
        setStatus('ready')
        return payload
      } catch (nextError) {
        setError(nextError)
        setStatus(snapshot ? 'ready' : 'error')
        return snapshot
      } finally {
        inFlightRef.current = null
      }
    })()

    inFlightRef.current = request
    return request
  }, [snapshot])

  useEffect(() => {
    if (!canLoad) return
    refresh()
  }, [canLoad, refresh])

  const value = useMemo(
    () => ({
      snapshot,
      profile: snapshot?.profile || null,
      user: snapshot?.user || null,
      credits: snapshot?.credits || null,
      gamesCount: snapshot?.gamesCount || 0,
      courseProgress: snapshot?.courseProgress || null,
      appVersion: snapshot?.appVersion || '',
      loading: status === 'loading',
      refreshing: status === 'refreshing',
      ready: status === 'ready',
      error,
      refresh,
    }),
    [error, refresh, snapshot, status],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider')
  }
  return context
}
