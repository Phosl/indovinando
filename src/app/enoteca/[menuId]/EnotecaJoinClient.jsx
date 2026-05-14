'use client'

import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseAnonClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {ENOTECA_DICTIONARY, pickLangText} from '@/lib/i18n/dictionaries'
// Shared layout from live game – same header/button system as play & results
import styles from '../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './enotecaJoin.module.scss'

export default function EnotecaJoinClient({
  menuId,
  menuName,
  menuDescription,
  menuLocation,
  bottleCount,
}) {
  const {lang} = useLanguage()
  const t = pickLangText(lang, ENOTECA_DICTIONARY.join)

  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [tableName, setTableName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [existingSession, setExistingSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const sessionKey = `enoteca_session_${menuId}`
  const startFormId = `enoteca-start-form-${menuId}`
  const backHref = '/miei-giochi'

  useEffect(() => {
    let savedId = null
    try {
      savedId = localStorage.getItem(sessionKey)
    } catch {}

    if (!savedId) {
      setCheckingSession(false)
      return
    }

    let cancelled = false

    const loadSession = async () => {
      try {
        const {data, error} = await supabaseAnonClient
          .from('enoteca_tasting_sessions')
          .select('id, nickname, current_bottle_index, status')
          .eq('id', savedId)
          .single()

        if (error || !data) {
          try {
            localStorage.removeItem(sessionKey)
          } catch {}
          return
        }

        if (!cancelled) {
          setExistingSession(data)
        }
      } catch (err) {
        console.error('enoteca load session error:', err)
        try {
          localStorage.removeItem(sessionKey)
        } catch {}
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [sessionKey])

  const handleResume = () => router.push(`/enoteca/${menuId}/play`)

  const handleStart = async (e) => {
    e.preventDefault()
    if (loading) return

    const trimmed = nickname.trim()
    if (!trimmed) {
      setError(t.nicknameRequired)
      return
    }
    setError(null)
    setLoading(true)
    let didNavigate = false

    try {
      const response = await fetch('/api/enoteca/session/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          gameId: menuId,
          nickname: trimmed,
          tableName: tableName.trim() || null,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.id) {
        const serverError = payload?.error ? ` (${payload.error})` : ''
        setError(`${t.startError}${serverError}`)
        return
      }

      try {
        localStorage.setItem(sessionKey, payload.id)
      } catch (storageErr) {
        console.warn('enoteca localStorage unavailable, using sid query fallback', storageErr)
      }

      didNavigate = true
      router.push(`/enoteca/${menuId}/play?sid=${payload.id}`)
    } catch (unexpectedErr) {
      console.error('enoteca start unexpected error:', unexpectedErr)
      setError(t.startError)
    } finally {
      if (!didNavigate) {
        setLoading(false)
      }
    }
  }

  if (checkingSession) {
    return (
      <div className={styles.fullPage} style={{alignItems: 'center', justifyContent: 'center'}}>
        <p className={styles.readyHint}>{t.loading}</p>
      </div>
    )
  }

  const hasActiveSession = existingSession && existingSession.status !== 'completed'

  return (
    <div className={styles.fullPage}>
      <div className={styles.topBarContainer}>
        <TopBar title={`🍷 ${t.enotecaLabel}`} onBack={() => router.push(backHref)}></TopBar>
      </div>
      <div className={styles.slideContent}>
        {/* Event info card */}
        <div className={xStyles.infoCard}>
          <span className={xStyles.wineBadge}>🍷</span>
          <h1 className={xStyles.menuName}>{menuName}</h1>
          {menuLocation && <p className={xStyles.location}>📍 {menuLocation}</p>}
          {menuDescription && <p className={xStyles.description}>{menuDescription}</p>}
          <span className={xStyles.bottleCount}>
            {bottleCount} {bottleCount === 1 ? t.bottleCountSingular : t.bottleCountPlural}
          </span>
        </div>

        {/* Resume banner */}
        {hasActiveSession && (
          <div className={xStyles.resumeCard}>
            <span className={xStyles.resumeTitle}>{t.sessionInProgress}</span>
            <p className={xStyles.resumeText}>
              {t.welcomeBack}, <strong>{existingSession.nickname}</strong>! {t.progressHint}
            </p>
          </div>
        )}

        {/* Form – only if no active session */}
        {!hasActiveSession && (
          <form id={startFormId} className={xStyles.form} onSubmit={handleStart}>
            <div className={xStyles.field}>
              <label htmlFor="nickname">{t.nicknameLabel}</label>
              <input
                id="nickname"
                type="text"
                placeholder={t.nicknamePlaceholder}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                autoComplete="off"
                autoFocus
                required
              />
            </div>
            <div className={xStyles.field}>
              <label htmlFor="table">{t.tableLabel}</label>
              <input
                id="table"
                type="text"
                placeholder={t.tablePlaceholder}
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                maxLength={40}
                autoComplete="off"
              />
            </div>
            {error && <p className={xStyles.error}>{error}</p>}
          </form>
        )}
      </div>

      {/* ── Bottom panel – consistent across all enoteca pages ── */}
      <div className={styles.bottomPanel}>
        {hasActiveSession ? (
          <>
            <button className={styles.continueButton} onClick={handleResume}>
              {t.resume}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => {
                localStorage.removeItem(sessionKey)
                setExistingSession(null)
              }}>
              {t.startNew}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => {
                localStorage.removeItem(sessionKey)
                router.push('/')
              }}>
              {t.leave}
            </button>
          </>
        ) : (
          <button
            type="submit"
            form={startFormId}
            className={styles.continueButton}
            disabled={loading}>
            {loading ? t.starting : `🍷 ${t.start}`}
          </button>
        )}
      </div>
    </div>
  )
}
