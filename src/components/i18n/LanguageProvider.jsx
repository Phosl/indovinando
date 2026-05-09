'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {DEFAULT_LANGUAGE, LANGUAGE_COOKIE, normalizeLanguage} from '@/lib/i18n/config'

const STORAGE_KEY = 'app_lang'

const LanguageContext = createContext({
  lang: DEFAULT_LANGUAGE,
  setLang: () => {},
  isEnglish: false,
})

function setLanguageCookie(lang) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}

export default function LanguageProvider({initialLang = DEFAULT_LANGUAGE, children}) {
  const router = useRouter()
  const [lang, setLangState] = useState(normalizeLanguage(initialLang))

  const setLang = useCallback(
    (nextLang) => {
      const normalized = normalizeLanguage(nextLang)
      if (normalized === lang) return

      setLangState(normalized)
      localStorage.setItem(STORAGE_KEY, normalized)
      setLanguageCookie(normalized)
      document.documentElement.lang = normalized

      // Refresh server-rendered text immediately when language changes.
      router.refresh()
    },
    [lang, router],
  )

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    const normalized = normalizeLanguage(stored)
    if (normalized !== lang) {
      setLang(normalized)
      return
    }
    setLanguageCookie(normalized)
  }, [lang, setLang])

  useEffect(() => {
    const normalized = normalizeLanguage(lang)
    document.documentElement.lang = normalized
    localStorage.setItem(STORAGE_KEY, normalized)
    setLanguageCookie(normalized)
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isEnglish: lang === 'en',
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
