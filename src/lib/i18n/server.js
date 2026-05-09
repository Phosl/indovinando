import {cookies} from 'next/headers'
import {LANGUAGE_COOKIE, normalizeLanguage} from './config'

export async function getServerLanguage() {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LANGUAGE_COOKIE)?.value
  return normalizeLanguage(cookieValue)
}
