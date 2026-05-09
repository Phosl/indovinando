'use client'

import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
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

  useEffect(() => {
    const savedId = localStorage.getItem(sessionKey)
    if (!savedId) {
      setCheckingSession(false)
      return
    }
    supabaseClient
      .from('enoteca_tasting_sessions')
      .select('id, nickname, current_bottle_index, status')
      .eq('id', savedId)
      .single()
      .then(({data}) => {
        if (data) setExistingSession(data)
        setCheckingSession(false)
      })
  }, [sessionKey])

  const handleResume = () => router.push(`/enoteca/${menuId}/play`)

  const handleStart = async (e) => {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) {
      setError(t.nicknameRequired)
      return
    }
    setError(null)
    setLoading(true)

    const {data: session, error: err} = await supabaseClient
      .from('enoteca_tasting_sessions')
      .insert({
        game_id: menuId,
        nickname: trimmed,
        table_name: tableName.trim() || null,
      })
      .select('id')
      .single()

    if (err || !session) {
      console.error('enoteca insert session error:', err)
      setError(t.startError)
      setLoading(false)
      return
    }

    localStorage.setItem(sessionKey, session.id)
    router.push(`/enoteca/${menuId}/play`)
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
      {/* ── TopBar – consistent across all enoteca pages ── */}
      <div className={styles.topBar}>
        <div className={styles.playerInfo}>
          <span className={styles.avatar}>🍷</span>
          <span className={styles.nickname}>{t.enotecaLabel}</span>
        </div>
        <div className={styles.topActions}>
          <button
            className={styles.exitButton}
            onClick={() => router.push('/')}
            aria-label={t.backToHome}>
            ✕
          </button>
        </div>
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
          <form className={xStyles.form} onSubmit={handleStart}>
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
          <button className={styles.continueButton} disabled={loading} onClick={handleStart}>
            {loading ? t.starting : `🍷 ${t.start}`}
          </button>
        )}
      </div>
    </div>
  )
}
