import it from './locales/it.json'
import en from './locales/en.json'

const LOCALES = {it, en}
const DEFAULT_LANG = 'it'

function getByPath(root, key) {
  if (!key) return root
  const parts = key.split('.')
  let value = root
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) return undefined
  }
  return value
}

export function getLocale(lang = DEFAULT_LANG) {
  return LOCALES[lang] ?? LOCALES[DEFAULT_LANG]
}

export function getLocaleText(lang, namespace, fallback = {}) {
  const locale = getLocale(lang)
  const fallbackLocale = LOCALES[DEFAULT_LANG]
  return getByPath(locale, namespace) ?? getByPath(fallbackLocale, namespace) ?? fallback
}
