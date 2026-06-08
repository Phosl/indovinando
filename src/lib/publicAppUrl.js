const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

export function getPublicAppOrigin() {
  const envBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (envBaseUrl) return envBaseUrl

  if (typeof window === 'undefined') return ''

  return normalizeBaseUrl(window.location.origin)
}

export function buildPublicAppUrl(path = '/') {
  const baseUrl = getPublicAppOrigin()
  if (!baseUrl) return path

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
