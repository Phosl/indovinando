export const SUPPORTED_LANGUAGES = ['it', 'en']
export const DEFAULT_LANGUAGE = 'it'
export const LANGUAGE_COOKIE = 'app_lang'

export function normalizeLanguage(value) {
  if (!value) return DEFAULT_LANGUAGE
  const normalized = String(value).toLowerCase()
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE
}

export function toLocaleTag(lang) {
  return normalizeLanguage(lang) === 'en' ? 'en-US' : 'it-IT'
}
