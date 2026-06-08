'use client'
import {useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import AvatarDisplay from '@/components/AvatarDisplay'
import Loader from '@/components/Loader'
import {useT} from '@/lib/i18n/useT'
import styles from './tableLiveEvent.module.scss'

function persistPlayer(sessionId, payload, avatarId) {
  try {
    localStorage.setItem(
      `table_live_player_${sessionId}`,
      JSON.stringify({
        playerId: payload.playerId,
        playerToken: payload.playerToken,
        nickname: payload.nickname,
        avatarId,
      }),
    )
  } catch {}
}

export default function TableLiveEntryClient({eventSlug, eventTitle, gameName, mode, initialJoinCode = ''}) {
  const router = useRouter()
  const t = useT('tableLiveEvent')
  const [nickname, setNickname] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(() => `${eventTitle} · ${gameName}`, [eventTitle, gameName])
  const isJoin = mode === 'join'

  const submit = async (event) => {
    event.preventDefault()
    if (!nickname.trim()) {
      setError(t('nicknameRequired'))
      return
    }

    if (isJoin && !initialJoinCode.trim()) {
      setError(t('joinCodeRequired'))
      return
    }

    setError('')
    setLoading(true)
    let didRedirect = false

    try {
      const response = await fetch(isJoin ? '/api/table-live/session/join' : '/api/table-live/session/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          eventSlug,
          nickname: nickname.trim(),
          ...(isJoin ? {joinCode: initialJoinCode.trim()} : {}),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.sessionId) {
        setError(payload?.error || t(isJoin ? 'joinError' : 'createError'))
        return
      }

      persistPlayer(payload.sessionId, payload, selectedAvatarId)
      didRedirect = true
      setRedirecting(true)
      router.push(`/table-live/session/${payload.sessionId}`)
    } catch {
      setError(t('networkError'))
    } finally {
      if (!didRedirect) setLoading(false)
    }
  }

  if (redirecting) {
    return (
      <div className={styles.page}>
        <div className={styles.topBarWrap}>
          <TopBar
            title={isJoin ? t('joinTitle') : t('createTitle')}
            onBack={() => router.push(`/table-live/event/${eventSlug}`)}
          />
        </div>
        <main className={styles.container}>
          <section className={styles.card}>
            <LoaderRow
              label={isJoin ? t('joiningAction') : t('creatingAction')}
              hint={t('eventLabel', {title})}
            />
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBarWrap}>
        <TopBar
          title={isJoin ? t('joinTitle') : t('createTitle')}
          onBack={() => router.push(`/table-live/event/${eventSlug}`)}
        />
      </div>
      <main className={styles.container}>
        <form className={styles.card} onSubmit={submit}>
          <label>{t('nicknameLabel')}</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={40}
            placeholder={isJoin ? t('nicknamePlaceholderJoin') : t('nicknamePlaceholderCreate')}
          />

          <div className={styles.sectionDivider} aria-hidden="true" />

          <label className={styles.avatarLabel}>{t('avatarLabel')}</label>
          <div className={styles.avatarGrid}>
            {Array.from({length: 10}).map((_, idx) => {
              const avatarId = idx + 1
              return (
                <button
                  key={avatarId}
                  type="button"
                  className={`${styles.avatarButton} ${
                    selectedAvatarId === avatarId ? styles.avatarSelected : ''
                  }`}
                  onClick={() => setSelectedAvatarId(avatarId)}>
                  <AvatarDisplay avatarId={avatarId} size={28} />
                </button>
              )
            })}
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
        </form>

        <p className={styles.hint}>{t('eventLabel', {title})}</p>
        <div className={styles.buttonRowSpacer} />
      </main>
      <div className={styles.buttonRow}>
        <button className="btn success-filled" type="button" onClick={submit} disabled={loading}>
          {loading ? t(isJoin ? 'joiningAction' : 'creatingAction') : t(isJoin ? 'joinAction' : 'createAction')}
        </button>
      </div>
    </div>
  )
}

function LoaderRow({label, hint}) {
  return (
    <div className={styles.loaderRow}>
      <Loader label={label} />
      {hint ? <p className={styles.loaderHint}>{hint}</p> : null}
    </div>
  )
}
