'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {
  createAppDataRequestCoordinator,
  createAppDataSessionGuard,
  isAppDataProfilePatchSatisfied,
  patchAppDataProfileSnapshot,
} from '@/lib/appDataSessionGuard.mjs'
import {createClient} from '@/lib/supabaseClient'

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
  const router = useRouter()
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [authRevision, setAuthRevision] = useState(0)
  const snapshotRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const wasLoadableRef = useRef(false)
  const canLoadRef = useRef(false)
  const loadedAuthRevisionRef = useRef(-1)
  const routerRefreshTimerRef = useRef(null)
  const authIdentityRef = useRef({initialized: false, userId: null})
  const verifiedProfilePatchRef = useRef(null)
  const sessionGuardRef = useRef(null)
  if (!sessionGuardRef.current) {
    sessionGuardRef.current = createAppDataSessionGuard()
  }
  const requestCoordinatorRef = useRef(null)
  if (!requestCoordinatorRef.current) {
    requestCoordinatorRef.current = createAppDataRequestCoordinator({
      isCurrent: (generation) => sessionGuardRef.current.isCurrent(generation),
    })
  }
  const canLoad = shouldLoadAppData(pathname)
  canLoadRef.current = canLoad

  const clearSnapshot = useCallback(
    ({nextError = null, nextStatus = 'idle', markLoaded = false} = {}) => {
      hasLoadedRef.current = markLoaded
      snapshotRef.current = null
      setSnapshot(null)
      setStatus(nextStatus)
      setError(nextError)
    },
    [],
  )

  const invalidate = useCallback(
    (options = {}) => {
      const hasExpectedUserId = Object.prototype.hasOwnProperty.call(
        options,
        'expectedUserId',
      )
      const nextExpectedUserId = hasExpectedUserId
        ? String(options.expectedUserId || '').trim() || null
        : undefined
      const pendingPatch = verifiedProfilePatchRef.current

      if (
        pendingPatch &&
        (!hasExpectedUserId || pendingPatch.userId !== nextExpectedUserId)
      ) {
        verifiedProfilePatchRef.current = null
      }

      sessionGuardRef.current.invalidate(options)
      clearSnapshot()
    },
    [clearSnapshot],
  )

  const refresh = useCallback(async ({force = false} = {}) => {
    const requestGeneration = sessionGuardRef.current.beginRequest()
    if (
      !requestCoordinatorRef.current.hasActive(requestGeneration) &&
      hasLoadedRef.current &&
      !force
    ) {
      return snapshotRef.current
    }

    return requestCoordinatorRef.current.run({
      generation: requestGeneration,
      force,
      load: async () => {
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
            const accepted = sessionGuardRef.current.accept(requestGeneration, null)
            const identityError = accepted
              ? null
              : new Error('APP_DATA_USER_MISMATCH')

            if (accepted) verifiedProfilePatchRef.current = null
            clearSnapshot({
              nextError: identityError,
              nextStatus: accepted ? 'unauthenticated' : 'error',
              markLoaded: accepted,
            })
            return null
          }

          const payload = await response.json().catch(() => null)
          if (!sessionGuardRef.current.isCurrent(requestGeneration)) {
            return snapshotRef.current
          }

          if (!response.ok || !payload) {
            throw new Error(payload?.error || 'Unable to load app data')
          }

          if (
            !payload.user?.id ||
            !sessionGuardRef.current.accept(requestGeneration, payload.user.id)
          ) {
            const identityError = new Error('APP_DATA_USER_MISMATCH')
            clearSnapshot({nextError: identityError, nextStatus: 'error'})
            return null
          }

          const pendingPatch = verifiedProfilePatchRef.current
          let nextPayload = payload
          if (pendingPatch?.userId === payload.user.id) {
            if (
              isAppDataProfilePatchSatisfied(
                payload,
                pendingPatch.profile,
                pendingPatch.userId,
              )
            ) {
              if (verifiedProfilePatchRef.current === pendingPatch) {
                verifiedProfilePatchRef.current = null
              }
            } else {
              nextPayload = patchAppDataProfileSnapshot(
                payload,
                pendingPatch.profile,
                pendingPatch.userId,
              )
            }
          }

          hasLoadedRef.current = true
          snapshotRef.current = nextPayload
          setSnapshot(nextPayload)
          setStatus('ready')
          return nextPayload
        } catch (nextError) {
          if (!sessionGuardRef.current.isCurrent(requestGeneration)) {
            return snapshotRef.current
          }

          setError(nextError)
          setStatus(snapshotRef.current ? 'ready' : 'error')
          return snapshotRef.current
        }
      },
    })
  }, [clearSnapshot])

  const applyVerifiedProfilePatch = useCallback(
    (profilePatch, {expectedUserId} = {}) => {
      const normalizedExpectedUserId = String(expectedUserId || '').trim()
      const currentIdentity = authIdentityRef.current
      const snapshotUserId = String(snapshotRef.current?.user?.id || '').trim()

      if (
        !normalizedExpectedUserId ||
        !profilePatch ||
        typeof profilePatch !== 'object' ||
        Array.isArray(profilePatch) ||
        (currentIdentity.initialized &&
          currentIdentity.userId !== normalizedExpectedUserId) ||
        (snapshotUserId && snapshotUserId !== normalizedExpectedUserId)
      ) {
        return false
      }

      const pendingPatch = verifiedProfilePatchRef.current
      verifiedProfilePatchRef.current = {
        userId: normalizedExpectedUserId,
        profile:
          pendingPatch?.userId === normalizedExpectedUserId
            ? {...pendingPatch.profile, ...profilePatch}
            : {...profilePatch},
      }

      const updateSnapshot = () => {
        const activePatch = verifiedProfilePatchRef.current
        if (activePatch?.userId !== normalizedExpectedUserId) {
          return snapshotRef.current
        }

        const currentSnapshot = snapshotRef.current
        const nextSnapshot = patchAppDataProfileSnapshot(
          currentSnapshot,
          activePatch.profile,
          normalizedExpectedUserId,
        )

        if (nextSnapshot === currentSnapshot) return currentSnapshot

        snapshotRef.current = nextSnapshot
        setSnapshot(nextSnapshot)
        return nextSnapshot
      }

      updateSnapshot()

      void (async () => {
        try {
          await refresh({force: true})
        } catch {
          // The mutation is already verified by its write endpoint. Keep the
          // confirmed fields locally when background revalidation is unavailable.
        }

        updateSnapshot()
      })()

      return true
    },
    [refresh],
  )

  useEffect(() => {
    if (!canLoad) {
      if (wasLoadableRef.current) {
        const identity = authIdentityRef.current
        invalidate(
          identity.initialized
            ? {expectedUserId: identity.userId}
            : {},
        )
      }
      wasLoadableRef.current = false
      return
    }

    if (!authIdentityRef.current.initialized) return

    const isEnteringDataArea = !wasLoadableRef.current
    const identityChanged = loadedAuthRevisionRef.current !== authRevision
    wasLoadableRef.current = true
    loadedAuthRevisionRef.current = authRevision
    void refresh({force: isEnteringDataArea || identityChanged})
  }, [authRevision, canLoad, invalidate, refresh])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id || null
      const previousIdentity = authIdentityRef.current

      if (previousIdentity.initialized && previousIdentity.userId === nextUserId) {
        return
      }

      authIdentityRef.current = {initialized: true, userId: nextUserId}
      invalidate({expectedUserId: nextUserId})
      setAuthRevision((current) => current + 1)

      if (previousIdentity.initialized && canLoadRef.current) {
        if (routerRefreshTimerRef.current !== null) {
          window.clearTimeout(routerRefreshTimerRef.current)
        }
        routerRefreshTimerRef.current = window.setTimeout(() => {
          routerRefreshTimerRef.current = null
          router.refresh()
        }, 0)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (routerRefreshTimerRef.current !== null) {
        window.clearTimeout(routerRefreshTimerRef.current)
        routerRefreshTimerRef.current = null
      }
    }
  }, [invalidate, router])

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
      applyVerifiedProfilePatch,
      invalidate,
      refresh,
    }),
    [applyVerifiedProfilePatch, error, invalidate, refresh, snapshot, status],
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
