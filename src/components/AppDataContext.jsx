'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {usePathname} from 'next/navigation'
import {createAppDataSessionGuard} from '@/lib/appDataSessionGuard.mjs'

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
  const snapshotRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const inFlightRef = useRef(null)
  const wasLoadableRef = useRef(false)
  const sessionGuardRef = useRef(null)
  if (!sessionGuardRef.current) {
    sessionGuardRef.current = createAppDataSessionGuard()
  }
  const canLoad = shouldLoadAppData(pathname)

  const invalidate = useCallback((options = {}) => {
    sessionGuardRef.current.invalidate(options)
    hasLoadedRef.current = false
    inFlightRef.current = null
    snapshotRef.current = null
    setSnapshot(null)
    setStatus('idle')
    setError(null)
  }, [])

  const refresh = useCallback(async ({force = false} = {}) => {
    const requestGeneration = sessionGuardRef.current.beginRequest()
    const activeRequest = inFlightRef.current
    if (activeRequest?.generation === requestGeneration) {
      return activeRequest.promise
    }
    if (hasLoadedRef.current && !force) return snapshotRef.current

    let request
    request = (async () => {
      setStatus(snapshotRef.current ? 'refreshing' : 'loading')
      setError(null)

      try {
        const response = await fetch('/api/app-data', {
          cache: 'no-store',
          headers: {'Accept': 'application/json'},
        })

        if (!sessionGuardRef.current.isCurrent(requestGeneration)) {
          return snapshotRef.current
        }

        if (response.status === 401) {
          if (!sessionGuardRef.current.accept(requestGeneration, null)) {
            throw new Error('APP_DATA_USER_MISMATCH')
          }

          hasLoadedRef.current = true
          snapshotRef.current = null
          setSnapshot(null)
          setStatus('unauthenticated')
          return null
        }

        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload) {
          throw new Error(payload?.error || 'Unable to load app data')
        }

        if (
          !payload.user?.id ||
          !sessionGuardRef.current.accept(requestGeneration, payload.user.id)
        ) {
          throw new Error('APP_DATA_USER_MISMATCH')
        }

        hasLoadedRef.current = true
        snapshotRef.current = payload
        setSnapshot(payload)
        setStatus('ready')
        return payload
      } catch (nextError) {
        if (!sessionGuardRef.current.isCurrent(requestGeneration)) {
          return snapshotRef.current
        }

        setError(nextError)
        setStatus(snapshotRef.current ? 'ready' : 'error')
        return snapshotRef.current
      } finally {
        if (inFlightRef.current?.promise === request) {
          inFlightRef.current = null
        }
      }
    })()

    inFlightRef.current = {generation: requestGeneration, promise: request}
    return request
  }, [])

  useEffect(() => {
    if (!canLoad) {
      if (wasLoadableRef.current) invalidate()
      wasLoadableRef.current = false
      return
    }

    const isEnteringDataArea = !wasLoadableRef.current
    wasLoadableRef.current = true
    refresh({force: isEnteringDataArea})
  }, [canLoad, invalidate, refresh])

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
      invalidate,
      refresh,
    }),
    [error, invalidate, refresh, snapshot, status],
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
