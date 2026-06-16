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

function LoaderRow({label, hint}) {
  return (
    <div className={styles.loaderRow}>
      <Loader label={label} />
      {hint ? <p className={styles.loaderHint}>{hint}</p> : null}
    </div>
  )
}

export default function TableLiveEntryClient({
  eventSlug,
  eventTitle,
  gameName,
  mode,
  initialJoinCode = '',
}) {
  const router = useRouter()
  const t = useT('tableLiveEvent')
  const [nickname, setNickname] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(1)
  const [answerRevealMode, setAnswerRevealMode] = useState('instant')
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(() => `${eventTitle} · ${gameName}`, [eventTitle, gameName])
  const isJoin = mode === 'join'
  const totalSteps = isJoin ? 2 : 3
  const isLastStep = stepIndex === totalSteps - 1
  const isOptionsStep = !isJoin && stepIndex === 2
  const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 100

  const stepTitle = useMemo(() => {
    if (stepIndex === 0) return t('stepNickname')
    if (stepIndex === 1) return t('stepAvatar')
    return t('stepQuiz')
  }, [stepIndex, t])

  const validateCurrentStep = () => {
    if (stepIndex === 0 && !nickname.trim()) {
      setError(t('nicknameRequired'))
      return false
    }
    return true
  }

  const handleBack = () => {
    if (stepIndex === 0) {
      router.push(`/table-live/event/${eventSlug}`)
      return
    }
    setError('')
    setStepIndex((current) => Math.max(0, current - 1))
  }

  const handleContinue = () => {
    if (!validateCurrentStep()) return
    setError('')
    setStepIndex((current) => Math.min(totalSteps - 1, current + 1))
  }

  const submit = async (event) => {
    event?.preventDefault()

    if (!isLastStep) {
      handleContinue()
      return
    }

    if (!validateCurrentStep()) return

    if (isJoin && !initialJoinCode.trim()) {
      setError(t('joinCodeRequired'))
      return
    }

    setError('')
    setLoading(true)
    window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'forward'}}))
    let didRedirect = false

    try {
      const response = await fetch(
        isJoin ? '/api/table-live/session/join' : '/api/table-live/session/create',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            eventSlug,
            nickname: nickname.trim(),
            ...(!isJoin ? {answerRevealMode} : {}),
            ...(isJoin ? {joinCode: initialJoinCode.trim()} : {}),
          }),
        },
      )

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.sessionId) {
        setError(payload?.error || t(isJoin ? 'joinError' : 'createError'))
        return
      }

      persistPlayer(payload.sessionId, payload, selectedAvatarId)
      didRedirect = true
      router.replace(`/table-live/session/${payload.sessionId}`)
    } catch {
      setError(t('networkError'))
    } finally {
      if (!didRedirect) setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.topBarWrap}>
          <TopBar
            title={isJoin ? t('joinTitle') : t('createTitle')}
            progress={progress}
            onBack={handleBack}
          />
        </div>
        <main className={`${styles.container} ${styles.loadingContainer}`}>
          <section className={`${styles.card} ${styles.loadingCard}`}>
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
          progress={progress}
          onBack={handleBack}
        />
      </div>

      <main className={styles.container}>
        <form className={styles.card} onSubmit={submit}>
          <div className={styles.stepHeader}>
            {!isOptionsStep ? (
              <span className={styles.stepEyebrow}>
                {t('stepCounter', {current: String(stepIndex + 1), total: String(totalSteps)})}
              </span>
            ) : null}
            <h2 className={styles.stepTitle}>{stepTitle}</h2>
            {!isOptionsStep ? <p className={styles.stepHint}>{t('eventLabel', {title})}</p> : null}
          </div>

          {stepIndex === 0 ? (
            <>
              <label>{t('nicknameLabel')}</label>
              <input
                value={nickname}
                onChange={(nextEvent) => setNickname(nextEvent.target.value)}
                maxLength={40}
                placeholder={isJoin ? t('nicknamePlaceholderJoin') : t('nicknamePlaceholderCreate')}
              />
            </>
          ) : null}

          {stepIndex === 1 ? (
            <>
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
            </>
          ) : null}

          {isOptionsStep ? (
            <section className={styles.settingsCard}>
              <p className={styles.settingsDescription}>{t('answerMode.description')}</p>
              <div className={styles.settingsOptions}>
                <button
                  type="button"
                  className={`${styles.settingsOption} ${
                    answerRevealMode === 'instant' ? styles.settingsOptionActive : ''
                  }`}
                  onClick={() => setAnswerRevealMode('instant')}>
                  <span className={styles.settingsOptionTitle}>{t('answerMode.instantTitle')}</span>
                  <span className={styles.settingsOptionText}>{t('answerMode.instantBody')}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.settingsOption} ${
                    answerRevealMode === 'end' ? styles.settingsOptionActive : ''
                  }`}
                  onClick={() => setAnswerRevealMode('end')}>
                  <span className={styles.settingsOptionTitle}>{t('answerMode.endTitle')}</span>
                  <span className={styles.settingsOptionText}>{t('answerMode.endBody')}</span>
                </button>
              </div>
            </section>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}
        </form>

        <p className={styles.hint}>{t('eventLabel', {title})}</p>
      </main>

      <div className={styles.buttonRow}>
        {stepIndex > 0 ? (
          <button className="btn neutral" type="button" onClick={handleBack} disabled={loading}>
            {t('backAction')}
          </button>
        ) : null}
        <button className="btn success-filled" type="button" onClick={submit} disabled={loading}>
          {loading
            ? t(isJoin ? 'joiningAction' : 'creatingAction')
            : isLastStep
              ? t(isJoin ? 'joinAction' : 'createAction')
              : t('continueAction')}
        </button>
      </div>
    </div>
  )
}
