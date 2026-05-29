const MOBILE_BREAKPOINT = 768

export function isMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= MOBILE_BREAKPOINT
}

export function watchMobileViewport(onChange) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  const emit = () => onChange(Boolean(mediaQuery.matches))
  emit()
  mediaQuery.addEventListener?.('change', emit)

  return () => {
    mediaQuery.removeEventListener?.('change', emit)
  }
}
