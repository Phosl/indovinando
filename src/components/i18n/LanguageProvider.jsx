'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {DEFAULT_LANGUAGE, LANGUAGE_COOKIE, normalizeLanguage} from '@/lib/i18n/config'
import {supabaseClient} from '@/lib/supabaseClient'

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
  const [userId, setUserId] = useState(null)
  const langRef = useRef(lang)

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const persistLanguagePreference = useCallback(async (uid, nextLang) => {
    if (!uid) return
    const normalized = normalizeLanguage(nextLang)

    const {error} = await supabaseClient.from('profiles').upsert(
      {
        id: uid,
        preferred_language: normalized,
        updated_at: new Date().toISOString(),
      },
      {onConflict: 'id'},
    )

    if (error) {
      console.error('[language] failed to persist preferred_language:', error.message)
    }
  }, [])

  const setLang = useCallback(
    (nextLang) => {
      const normalized = normalizeLanguage(nextLang)
      if (normalized === lang) return

      setLangState(normalized)
      localStorage.setItem(STORAGE_KEY, normalized)
      setLanguageCookie(normalized)
      document.documentElement.lang = normalized

      if (userId) {
        persistLanguagePreference(userId, normalized).then(() => {})
      }

      // Refresh server-rendered text immediately when language changes.
      router.refresh()
    },
    [lang, persistLanguagePreference, router, userId],
  )

  useEffect(() => {
    let cancelled = false

    async function initLanguage() {
      try {
        const rawStored = localStorage.getItem(STORAGE_KEY)
        const stored = rawStored ? normalizeLanguage(rawStored) : normalizeLanguage(initialLang)

        const {
          data: {user},
        } = await supabaseClient.auth.getUser()

        if (cancelled) return

        const uid = user?.id ?? null
        setUserId(uid)

        let resolved = stored

        if (uid) {
          const {data: profile} = await supabaseClient
            .from('profiles')
            .select('preferred_language')
            .eq('id', uid)
            .maybeSingle()

          if (cancelled) return

          const dbLang = profile?.preferred_language
            ? normalizeLanguage(profile.preferred_language)
            : null
          if (dbLang) resolved = dbLang

          // Backfill preference for users that still don't have it in DB.
          if (!profile?.preferred_language) {
            persistLanguagePreference(uid, resolved).then(() => {})
          }
        }

        if (resolved !== langRef.current) {
          setLangState(resolved)
        }
        localStorage.setItem(STORAGE_KEY, resolved)
        setLanguageCookie(resolved)
        document.documentElement.lang = resolved
      } catch (error) {
        console.error('[language] init error:', error)
      }
    }

    initLanguage()

    const {
      data: {subscription},
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      try {
        const uid = session?.user?.id ?? null
        setUserId(uid)
        if (!uid) return

        const {data: profile} = await supabaseClient
          .from('profiles')
          .select('preferred_language')
          .eq('id', uid)
          .maybeSingle()

        const dbLang = profile?.preferred_language
          ? normalizeLanguage(profile.preferred_language)
          : null
        if (dbLang && dbLang !== langRef.current) {
          setLangState(dbLang)
          localStorage.setItem(STORAGE_KEY, dbLang)
          setLanguageCookie(dbLang)
          document.documentElement.lang = dbLang
        }
      } catch (error) {
        console.error('[language] auth sync error:', error)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [initialLang, persistLanguagePreference])

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
