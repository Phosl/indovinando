'use client'

import {useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import AvatarDisplay from '@/components/AvatarDisplay'
import {useT} from '@/lib/i18n/useT'
import styles from './tableLiveEvent.module.scss'
import {Button} from '@/components/ui/Button'
import Icon from '@/components/Icon'
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

export default function TableLiveEventClient({eventSlug, eventTitle, gameName}) {
  const router = useRouter()
  const t = useT('tableLiveEvent')
  const [step, setStep] = useState('home') // home | create | join
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const joinCodeInputRefs = useRef([])

  const title = useMemo(() => `${eventTitle} · ${gameName}`, [eventTitle, gameName])
  const joinCodeDigits = Array.from({length: 4}, (_, index) => joinCode[index] || '')

  const focusJoinDigit = (index) => {
    const nextNode = joinCodeInputRefs.current[index]
    if (nextNode) nextNode.focus()
  }

  const updateJoinCodeDigit = (index, rawValue) => {
    const digits = String(rawValue || '').replace(/\D+/g, '')
    if (!digits) {
      const next = joinCode.padEnd(4, ' ').split('')
      next[index] = ''
      setJoinCode(next.join('').replace(/\s+/g, ''))
      return
    }

    const next = joinCode.padEnd(4, ' ').split('')
    digits
      .slice(0, 4 - index)
      .split('')
      .forEach((digit, offset) => {
        next[index + offset] = digit
      })

    const normalized = next.join('').replace(/\s+/g, '').slice(0, 4)
    setJoinCode(normalized)

    const nextIndex = Math.min(index + digits.length, 3)
    window.requestAnimationFrame(() => focusJoinDigit(nextIndex))
  }

  const handleJoinCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !joinCodeDigits[index] && index > 0) {
      event.preventDefault()
      focusJoinDigit(index - 1)
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusJoinDigit(index - 1)
    }
    if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault()
      focusJoinDigit(index + 1)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError(t('nicknameRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/table-live/session/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          eventSlug,
          nickname: nickname.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.sessionId) {
        setError(payload?.error || t('createError'))
        return
      }
      persistPlayer(payload.sessionId, payload, selectedAvatarId)
      router.push(`/table-live/session/${payload.sessionId}`)
    } catch {
      setError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError(t('nicknameRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/table-live/session/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          eventSlug,
          nickname: nickname.trim(),
          joinCode: joinCode.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.sessionId) {
        setError(payload?.error || t('joinError'))
        return
      }
      persistPlayer(payload.sessionId, payload, selectedAvatarId)
      router.push(`/table-live/session/${payload.sessionId}`)
    } catch {
      setError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBarWrap}>
        <TopBar title={t('topBarTitle')} onBack={() => router.push('/')} />
      </div>
      <main className={styles.container}>
        <header className={styles.header}>
          <img src="/logo.svg" alt="Indovinando Logo" className={styles.logo} />
          <h1>{eventTitle}</h1>
          {/* <p>{gameName}</p> */}
        </header>

        {step === 'home' ? (
          <section className={styles.card}>
            <label>{t('joinCodeLabel')}</label>
            <div className={styles.codeInputGroup} aria-label={t('joinCodeAria')}>
              {joinCodeDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    joinCodeInputRefs.current[index] = node
                  }}
                  value={digit}
                  onChange={(e) => updateJoinCodeDigit(index, e.target.value)}
                  onKeyDown={(e) => handleJoinCodeKeyDown(index, e)}
                  onPaste={(e) => {
                    e.preventDefault()
                    updateJoinCodeDigit(index, e.clipboardData.getData('text'))
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={index === 0 ? '4' : ''}
                  maxLength={1}
                  className={styles.codeDigitInput}
                />
              ))}
            </div>
            <p className={styles.codeHint}>{t('joinCodeHint')}</p>
            <Button
              variant="primary-filled"
              type="button"
              onClick={() => {
                if (!joinCode.trim()) {
                  setError(t('joinCodeRequired'))
                  return
                }
                setError('')
                setStep('join')
              }}>
              <Icon name="enter" size={36} />
              {t('joinSessionAction')}
            </Button>

            <div className={styles.orSeparator}>
              <span>{t('orLabel')}</span>
            </div>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setError('')
                setStep('create')
              }}>
              <Icon name="plus" size={36} />
              {t('createSessionAction')}
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
          </section>
        ) : null}

        {step === 'create' ? (
          <form className={styles.card} onSubmit={handleCreate}>
            <h2>{t('createTitle')}</h2>
            <label>{t('nicknameLabel')}</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              placeholder={t('nicknamePlaceholderCreate')}
            />
            <label>{t('avatarLabel')}</label>
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
            <button className="btn success" type="submit" disabled={loading}>
              {loading ? t('creatingAction') : t('createAndStartAction')}
            </button>
            <button className="btn secondary" type="button" onClick={() => setStep('home')}>
              {t('backAction')}
            </button>
          </form>
        ) : null}

        {step === 'join' ? (
          <form className={styles.card} onSubmit={handleJoin}>
            <h2>{t('joinTitle')}</h2>
            <label>{t('joinCodeValueLabel')}</label>
            <div className={styles.codeValue}>{joinCode}</div>
            <label>{t('nicknameLabel')}</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              placeholder={t('nicknamePlaceholderJoin')}
            />
            <label>{t('avatarLabel')}</label>
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
            <button className="btn success" type="submit" disabled={loading}>
              {loading ? t('joiningAction') : t('joinAction')}
            </button>
            <button className="btn secondary" type="button" onClick={() => setStep('home')}>
              {t('backAction')}
            </button>
          </form>
        ) : null}

        <p className={styles.hint}>{t('eventLabel', {title})}</p>
      </main>
      <button className={styles.discoverAppBtn} type="button" onClick={() => router.push('/auth')}>
        {t('discoverAppAction')}
      </button>
    </div>
  )
}
