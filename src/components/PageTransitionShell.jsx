'use client'

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'

const LEAVE_MS = 0
const RECOVERY_MS = 1200

function shouldIgnoreClick(event) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

function isInternalNavigationAnchor(anchor) {
  if (!anchor) return false
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false
  if (anchor.dataset.noTransition === 'true') return false

  const href = anchor.getAttribute('href') || ''
  if (!href || href.startsWith('#')) return false

  const url = new URL(anchor.href, window.location.origin)
  if (url.origin !== window.location.origin) return false
  if (url.pathname.startsWith('/api')) return false

  return true
}

export default function PageTransitionShell({children}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLeaving, setIsLeaving] = useState(false)
  const [direction, setDirection] = useState('forward')
  const leaveTimeoutRef = useRef(null)
  const recoveryTimeoutRef = useRef(null)
  const transitionLockRef = useRef(false)
  const nextDirectionRef = useRef('forward')
  const prefetchedHrefsRef = useRef(new Set())

  const clearScheduledTransitions = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }

    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current)
      recoveryTimeoutRef.current = null
    }
  }, [])

  const resetTransitionState = useCallback(() => {
    clearScheduledTransitions()
    setIsLeaving(false)
    transitionLockRef.current = false
    nextDirectionRef.current = 'forward'
  }, [clearScheduledTransitions])

  const prefetchHref = useCallback((href) => {
    if (!href || prefetchedHrefsRef.current.has(href)) return
    prefetchedHrefsRef.current.add(href)
    router.prefetch(href)
  }, [router])

  const queueDirection = useCallback((nextDirection) => {
    const normalized = nextDirection === 'back' ? 'back' : 'forward'
    nextDirectionRef.current = normalized
    setDirection(normalized)
  }, [])

  useLayoutEffect(() => {
    clearScheduledTransitions()

    setDirection(nextDirectionRef.current === 'back' ? 'back' : 'forward')
    setIsLeaving(false)
    transitionLockRef.current = false
    nextDirectionRef.current = 'forward'

    return undefined
  }, [clearScheduledTransitions, pathname])

  useEffect(() => {
    const recoverIfNeeded = () => {
      if (document.hidden) return
      if (!transitionLockRef.current && !isLeaving) return
      resetTransitionState()
    }

    window.addEventListener('pageshow', recoverIfNeeded)
    window.addEventListener('focus', recoverIfNeeded)
    document.addEventListener('visibilitychange', recoverIfNeeded)

    return () => {
      window.removeEventListener('pageshow', recoverIfNeeded)
      window.removeEventListener('focus', recoverIfNeeded)
      document.removeEventListener('visibilitychange', recoverIfNeeded)
    }
  }, [isLeaving, resetTransitionState])

  useEffect(() => {
    const onNavigationIntent = (event) => {
      nextDirectionRef.current = event?.detail?.direction === 'back' ? 'back' : 'forward'
    }

    const onPopState = () => {
      queueDirection('back')
    }

    const onDocumentClick = (event) => {
      if (shouldIgnoreClick(event)) return

      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (!isInternalNavigationAnchor(anchor)) return

      const url = new URL(anchor.href, window.location.origin)
      const nextHref = `${url.pathname}${url.search}${url.hash}`
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`

      if (nextHref === currentHref) return
      if (transitionLockRef.current) {
        event.preventDefault()
        return
      }

      queueDirection(anchor.dataset.navDirection)
      prefetchHref(nextHref)

      event.preventDefault()
      transitionLockRef.current = true
      setIsLeaving(true)

      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current)
      }

      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current)
      }

      leaveTimeoutRef.current = window.setTimeout(() => {
        router.push(nextHref)
      }, LEAVE_MS)

      recoveryTimeoutRef.current = window.setTimeout(() => {
        if (transitionLockRef.current) {
          resetTransitionState()
        }
      }, RECOVERY_MS)
    }

    const onPointerOver = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (!isInternalNavigationAnchor(anchor)) return

      const url = new URL(anchor.href, window.location.origin)
      prefetchHref(`${url.pathname}${url.search}${url.hash}`)
    }

    const onFocusIn = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (!isInternalNavigationAnchor(anchor)) return

      const url = new URL(anchor.href, window.location.origin)
      prefetchHref(`${url.pathname}${url.search}${url.hash}`)
    }

    window.addEventListener('app:navigation-intent', onNavigationIntent)
    window.addEventListener('popstate', onPopState)
    document.addEventListener('pointerover', onPointerOver, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('click', onDocumentClick, true)

    return () => {
      window.removeEventListener('app:navigation-intent', onNavigationIntent)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('pointerover', onPointerOver, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('click', onDocumentClick, true)
      clearScheduledTransitions()
    }
  }, [clearScheduledTransitions, prefetchHref, queueDirection, resetTransitionState, router])

  const className = `route-shell route-${direction}${isLeaving ? ' is-leaving' : ' is-entering'}`

  return (
    <div key={pathname || 'root'} className={className}>
      {children}
    </div>
  )
}
