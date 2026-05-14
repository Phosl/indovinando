'use client'

import {useEffect, useRef, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'

const LEAVE_MS = 220
const ENTER_MS = 220

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
  const [isEntering, setIsEntering] = useState(false)
  const [direction, setDirection] = useState('forward')
  const leaveTimeoutRef = useRef(null)
  const enterTimeoutRef = useRef(null)
  const transitionLockRef = useRef(false)
  const nextDirectionRef = useRef('forward')

  const queueDirection = (nextDirection) => {
    const normalized = nextDirection === 'back' ? 'back' : 'forward'
    nextDirectionRef.current = normalized
    setDirection(normalized)
  }

  useEffect(() => {
    setIsLeaving(false)
    setIsEntering(true)
    setDirection(nextDirectionRef.current)

    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current)
    }

    enterTimeoutRef.current = window.setTimeout(() => {
      setIsEntering(false)
      transitionLockRef.current = false
      nextDirectionRef.current = 'forward'
      setDirection('forward')
    }, ENTER_MS)

    return () => {
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current)
      }
    }
  }, [pathname])

  useEffect(() => {
    const onNavigationIntent = (event) => {
      queueDirection(event?.detail?.direction)
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

      event.preventDefault()
      transitionLockRef.current = true
      setIsLeaving(true)

      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current)
      }

      leaveTimeoutRef.current = window.setTimeout(() => {
        router.push(nextHref)
      }, LEAVE_MS)
    }

    window.addEventListener('app:navigation-intent', onNavigationIntent)
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onDocumentClick, true)

    return () => {
      window.removeEventListener('app:navigation-intent', onNavigationIntent)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onDocumentClick, true)
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current)
      }
    }
  }, [router])

  const className = `route-shell route-${direction}${isLeaving ? ' is-leaving' : ''}${isEntering ? ' is-entering' : ''}`

  return <div className={className}>{children}</div>
}
