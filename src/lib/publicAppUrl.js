const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

export function getPublicAppOrigin() {
  if (typeof window !== 'undefined') {
    const runtimeOrigin = normalizeBaseUrl(window.location.origin)
    if (runtimeOrigin) return runtimeOrigin
  }

  const envBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (envBaseUrl) return envBaseUrl

  const vercelUrl = normalizeBaseUrl(process.env.VERCEL_URL)
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
  }

  return ''
}

export function buildPublicAppUrl(path = '/') {
  const baseUrl = getPublicAppOrigin()
  if (!baseUrl) return path

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
