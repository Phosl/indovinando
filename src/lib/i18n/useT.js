import {useCallback, useMemo} from 'react'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import it from './locales/it.json'
import en from './locales/en.json'

const LOCALES = {it, en}

function getByPath(root, key) {
  const parts = key.split('.')
  let value = root
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) return undefined
  }
  return value
}

/**
 * Returns a t(key) function scoped to a namespace.
 * Keys use dot notation within the namespace: t('title'), t('guest.desc')
 * Supports {placeholder} interpolation: t('passwordTooShort', {min: 6})
 *
 * @param {string} namespace - top-level key in the locale JSON (e.g. 'profile')
 */
export function useT(namespace) {
  const {lang} = useLanguage()
  const locale = LOCALES[lang] ?? LOCALES.it
  const ns = useMemo(
    () => (namespace ? (getByPath(locale, namespace) ?? {}) : locale),
    [locale, namespace],
  )
  const fallbackNs = useMemo(
    () => (namespace ? (getByPath(LOCALES.it, namespace) ?? {}) : LOCALES.it),
    [namespace],
  )

  const t = useCallback(
    (key, vars) => {
      let value = getByPath(ns, key)
      if (value === undefined) {
        value = getByPath(fallbackNs, key) ?? key
      }
      if (vars && typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
      }
      return value ?? key
    },
    [ns, fallbackNs],
  )

  return t
}
