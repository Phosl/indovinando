'use client'

import Image from 'next/image'
import {useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/Button'
import Icon from '@/components/Icon'
import {useT} from '@/lib/i18n/useT'
import styles from './tableLiveEvent.module.scss'
import TopBar from '@/components/TopBar'

export default function TableLiveEventHomeClient({
  eventSlug,
  eventTitle,
  gameName,
  showTopBar = false,
  backHref = '/',
}) {
  const router = useRouter()
  const t = useT('tableLiveEvent')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [validatingJoinCode, setValidatingJoinCode] = useState(false)
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
      setError('')
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
    setError('')

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

  const goToJoin = async () => {
    if (joinCode.trim().length !== 4) {
      setError(t('joinCodeRequired'))
      return
    }
    setError('')
    setValidatingJoinCode(true)
    let didNavigate = false
    try {
      const response = await fetch('/api/table-live/session/validate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          eventSlug,
          joinCode: joinCode.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 404) {
          setError(t('joinCodeInvalid'))
        } else if (response.status === 409) {
          setError(t('joinCodeClosed'))
        } else {
          setError(payload?.error || t('joinError'))
        }
        return
      }

      didNavigate = true
      window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'forward'}}))
      router.push(`/table-live/event/${eventSlug}/join?code=${encodeURIComponent(joinCode.trim())}`)
    } catch {
      setError(t('networkError'))
    } finally {
      if (!didNavigate) setValidatingJoinCode(false)
    }
  }

  const goToCreate = () => {
    setError('')
    window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'forward'}}))
    router.push(`/table-live/event/${eventSlug}/create`)
  }

  return (
    <div className={styles.page}>
      {showTopBar ? (
        <div className={styles.topBarWrap}>
          <TopBar title={t('topBarTitle')} onBack={() => router.push(backHref)} />
        </div>
      ) : null}
      <main className={styles.container}>
        <header className={styles.header}>
          <Image src="/logo.svg" alt="Indovinando Logo" className={styles.logo} width={96} height={96} />
          <h1>{eventTitle}</h1>
        </header>

        <section className={styles.card}>
          <div className={styles.createSection} aria-labelledby="create-session-title">
            <div className={styles.createSectionCopy}>
              <h2 id="create-session-title">{t('createSessionTitle')}</h2>
              <p>{t('createSessionDescription')}</p>
            </div>
            <Button variant="secondary" type="button" onClick={goToCreate}>
              <Icon name="plus" size={36} />
              {t('createSessionAction')}
            </Button>
          </div>

          <div className={styles.orSeparator}>
            <span>{t('orLabel')}</span>
          </div>

          <div className={styles.joinSection} aria-labelledby="join-code-label">
            <p
              id="join-code-label"
              className={`${styles.codeLabel} ${error ? styles.codeLabelError : ''}`}
              role={error ? 'alert' : undefined}>
              {error || t('joinCodeLabel')}
            </p>
            <div
              className={styles.codeInputGroup}
              role="group"
              aria-labelledby="join-code-label"
              aria-describedby="join-code-hint">
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
                  aria-label={t('joinCodeDigitAria', {position: index + 1})}
                  className={styles.codeDigitInput}
                />
              ))}
            </div>
            <p id="join-code-hint" className={styles.codeHint}>
              {t('joinCodeHint')}
            </p>
            <Button
              variant="primary-filled"
              type="button"
              onClick={goToJoin}
              disabled={validatingJoinCode}>
              <Icon name="enter" size={36} />
              {validatingJoinCode ? t('joinCodeChecking') : t('joinSessionAction')}
            </Button>
          </div>
        </section>

        <p className={styles.hint}>{t('eventLabel', {title})}</p>
      </main>
      <button className={styles.discoverAppBtn} type="button" onClick={() => router.push('/auth')}>
        {t('discoverAppAction')}
      </button>
    </div>
  )
}
