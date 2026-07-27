const INTERNAL_ORIGIN = 'https://indovinando.local'

export function getSafeInternalPath(value, fallback = '/') {
  const normalizedFallback =
    typeof fallback === 'string' && fallback.startsWith('/') && !fallback.startsWith('//')
      ? fallback
      : '/'
  const candidate = typeof value === 'string' ? value.trim() : ''

  if (!candidate.startsWith('/')) return normalizedFallback

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN)
    if (parsed.origin !== INTERNAL_ORIGIN) return normalizedFallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return normalizedFallback
  }
}
