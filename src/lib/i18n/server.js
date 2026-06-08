import {cookies, headers} from 'next/headers'
import {LANGUAGE_COOKIE, normalizeLanguage} from './config'

export async function getServerLanguage() {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LANGUAGE_COOKIE)?.value
  if (cookieValue) {
    return normalizeLanguage(cookieValue)
  }

  const headersStore = await headers()
  const acceptLanguage = headersStore.get('accept-language') || ''
  return normalizeLanguage(acceptLanguage)
}
