'use client'

import {useEffect, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import QRCode from 'qrcode'
import TopBar from '@/components/TopBar'
import ShareDetailsTabs from '@/components/ShareDetailsTabs/ShareDetailsTabs'
import AvatarDisplay from '@/components/AvatarDisplay'
import {useT} from '@/lib/i18n/useT'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './liveSessions.module.scss'

const withSaveTimeout = async (taskOrPromise, contextLabel, timeoutMs = 20000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Slow request. (${contextLabel}). Please try again.`))
    }, timeoutMs)
  })

  const operationPromise = typeof taskOrPromise === 'function' ? taskOrPromise() : taskOrPromise

  return Promise.race([operationPromise, timeoutPromise])
}

export default function LiveSessionClient({
  gameId,
  gameName,
  questions,
  questionsPreview = questions,
  bottles,
  userId,
}) {
  const router = useRouter()
  const t = useT('liveSession')
  const safeQuestionsPreview = questionsPreview || []
  const safeBottles = bottles || []
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionLink, setSessionLink] = useState('')
  const [playersCount, setPlayersCount] = useState(0)
  const [players, setPlayers] = useState([])
  const [recentJoinIds, setRecentJoinIds] = useState([])
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrTitle, setQrTitle] = useState(t('qrTitle'))
  const [qrLink, setQrLink] = useState('')
  const previousPlayerIdsRef = useRef(new Set())
  const joinTimersRef = useRef(new Map())

  // Crea sessione live al caricamento
  useEffect(() => {
    const createSession = async () => {
      try {
        setLoading(true)

        const {id} = await withSaveTimeout(async () => {
          const response = await fetch('/api/live/session/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({gameId}),
          })

          const payload = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(payload?.error || 'Failed to create live session')
          }

          return payload
        }, 'create-live-session')

        setSessionId(id)

        // Genera link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        setSessionLink(`${baseUrl}/live/session/${id}`)

        setLoading(false)
      } catch (err) {
        console.error('Error creating live session:', err)
        alert(t('createFailed'))
        setLoading(false)
      }
    }

    createSession()
  }, [gameId, userId, t])

  // Polling - ascolta i giocatori che si uniscono
  useEffect(() => {
    if (!sessionId) return

    previousPlayerIdsRef.current = new Set()
    setRecentJoinIds([])

    const pollPlayersNow = async () => {
      if (document.hidden) return
      try {
        const response = await fetch('/api/live/session/players-count', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({sessionId}),
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) return

        const nextPlayers = Array.isArray(payload?.players) ? payload.players : []
        const nextIds = new Set(nextPlayers.map((player) => player.id).filter(Boolean))
        const newIds = nextPlayers
          .map((player) => player.id)
          .filter((id) => id && !previousPlayerIdsRef.current.has(id))

        setPlayersCount(payload?.count || 0)
        setPlayers(nextPlayers)

        if (newIds.length > 0) {
          setRecentJoinIds((prev) => [...new Set([...prev, ...newIds])])

          newIds.forEach((id) => {
            const existingTimer = joinTimersRef.current.get(id)
            if (existingTimer) clearTimeout(existingTimer)

            const timerId = setTimeout(() => {
              setRecentJoinIds((prev) => prev.filter((playerId) => playerId !== id))
              joinTimersRef.current.delete(id)
            }, 1800)

            joinTimersRef.current.set(id, timerId)
          })
        }

        previousPlayerIdsRef.current = nextIds
      } catch {
        // Ignore transient polling errors and try again on next tick.
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) pollPlayersNow()
    }

    const pollPlayers = setInterval(pollPlayersNow, 1000) // Poll ogni 1 secondo
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(pollPlayers)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sessionId])

  useEffect(
    () => () => {
      joinTimersRef.current.forEach((timerId) => clearTimeout(timerId))
      joinTimersRef.current.clear()
    },
    [],
  )

  useEffect(() => {
    if (!sessionLink) return
    let cancelled = false

    QRCode.toDataURL(sessionLink, {width: 320, margin: 1, errorCorrectionLevel: 'M'})
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [sessionLink])

  useEffect(() => {
    if (!sessionLink) return
    setQrTitle(t('qrTitle'))
    setQrLink(sessionLink)
  }, [sessionLink, t])


  const handleCopyLink = () => {
    navigator.clipboard.writeText(sessionLink)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const handleShareLink = async () => {
    const shareText = `${gameName} · ${sessionLink}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: gameName,
          text: gameName,
          url: sessionLink,
        })
        return
      }
    } catch {
      return
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handlePrintQr = () => {
    if (!qrDataUrl || !qrLink) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${gameName} QR</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; text-align: center; }
            .logo { width: 120px; height: auto; margin: 0 auto 12px; display: block; }
            img { width: 280px; height: 280px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            p { font-size: 12px; color: #444; word-break: break-all; }
          </style>
        </head>
        <body>
          <img class="logo" src="${window.location.origin}/logo.svg" alt="Indovinando" />
          <h1>${qrTitle || gameName}</h1>
          <img src="${qrDataUrl}" alt="QR" />
          <p>${qrLink}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }


  const handleStartGame = async () => {
    if (isStartingGame) return

    try {
      setIsStartingGame(true)

      await withSaveTimeout(async () => {
        const response = await fetch('/api/live/session/start', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({sessionId}),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to start live session')
        }
      }, 'start-game-session')

      router.push(`/live/session/${sessionId}/play`)
    } catch (err) {
      console.error('Error starting game:', err)
      alert(t('startFailed'))
    } finally {
      setIsStartingGame(false)
    }
  }

  const handleCancel = async () => {
    try {
      await withSaveTimeout(async () => {
        const response = await fetch('/api/live/session/cancel', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({sessionId}),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to cancel live session')
        }
      }, 'cancel-live-session')

      router.push('/miei-giochi')
    } catch (err) {
      console.error('Error canceling session:', err)
      alert(t('cancelFailed'))
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <TopBar title={t('creatingSession')} onBack={() => router.push('/miei-giochi')} />
        <div className={styles.progressBarTrack}>
          <div className={styles.progressBarFill} />
        </div>
        <div className={styles.lobbyCard}>
          <div className={styles.section}>
            <span className={`skeleton ${styles.skeletonHeading}`} />
            <div className={styles.linkBox}>
              <span className={`skeleton ${styles.skeletonLinkInput}`} />
              <span className={`skeleton ${styles.skeletonCopyBtn}`} />
            </div>
          </div>
          <div className={styles.section}>
            <span className={`skeleton ${styles.skeletonHeading}`} />
            <span className={`skeleton ${styles.skeletonInfo}`} />
          </div>
          <div className={styles.section}>
            <span className={`skeleton ${styles.skeletonSubheading}`} />
            <span className={`skeleton ${styles.skeletonListItem}`} />
            <span className={`skeleton ${styles.skeletonListItem}`} />
          </div>
          <div className={styles.actions}>
            <span className={`skeleton ${styles.skeletonStartBtn}`} />
            <span className={`skeleton ${styles.skeletonCancelBtn}`} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <TopBar title={gameName} onBack={() => router.push('/miei-giochi')} />

      <div className={styles.lobbyCard}>
        <ShareDetailsTabs
          shareLabel={t('shareTabLabel')}
          detailsLabel={t('detailsTabLabel')}
          shareContent={
            <>
              <div className={styles.section}>
                <p className={styles.bridgeTitle}>{t('inviteLinkTitle')}</p>
                <p className={styles.bridgeHint}>{t('inviteLinkHint')}</p>
                <label className={styles.linkLabel} htmlFor="live-session-link">
                  {t('inviteLinkLabel')}
                </label>
                <div className={styles.linkBox}>
                  <input
                    id="live-session-link"
                    type="text"
                    readOnly
                    value={sessionLink}
                    className={styles.linkInput}
                  />
                  <div className={styles.linkActions}>
                    <button onClick={handleCopyLink} className={styles.copyButton}>
                      {copyFeedback ? t('copied') : t('copy')}
                    </button>
                    <button onClick={handleShareLink} className={styles.copyButton}>
                      {t('share')}
                    </button>
                    <button
                      onClick={() => {
                        setQrDataUrl(qrDataUrl)
                        setQrTitle(t('qrTitle'))
                        setQrLink(sessionLink)
                        setQrOpen(true)
                      }}
                      className={styles.copyButton}>
                      {t('qr')}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2>
                  {t('participants')}
                  {playersCount}
                </h2>
                <p className={styles.info}>{t('waitPlayers')}</p>
                {players.length > 0 ? (
                  <ul>
                    {players.map((player) => (
                      <li
                        key={player.id}
                        className={`${styles.participantItem} ${recentJoinIds.includes(player.id) ? styles.participantJustJoined : ''}`}>
                        <AvatarDisplay avatarId={player.avatar_id} size={24} />
                        <span className={styles.participantName}>
                          {player.nickname || t('participantFallback')}
                        </span>
                        {player.is_host ? (
                          <span className={styles.participantTag}>{t('hostLabel')}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.info}>{t('participantsEmpty')}</p>
                )}
              </div>

            </>
          }
          detailsContent={
            <>
              <div className={styles.section}>
                <div className={styles.questionPreviewBlock}>
                  <div className={styles.questionPreviewHeader}>
                    <span className={styles.questionPreviewTitle}>{t('questionPreviewTitle')}</span>
                    <span className={styles.questionPreviewCount}>
                      {safeQuestionsPreview.length}{' '}
                      {safeQuestionsPreview.length === 1 ? t('questionSingular') : t('questionPlural')}
                    </span>
                  </div>

                  <div className={styles.questionPreviewStrip} aria-label={t('questionPreviewTitle')}>
                    {safeQuestionsPreview.length === 0 ? (
                      <div className={styles.questionPreviewEmpty}>{t('questionPreviewEmpty')}</div>
                    ) : (
                      safeQuestionsPreview.map((question, index) => (
                        <article key={question.id} className={styles.questionPreviewCard}>
                          <h4 className={styles.questionPreviewText}>
                            {question.text || t('unknownQuestion')}
                          </h4>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.bottlePreviewBlock}>
                  <div className={styles.bottlePreviewHeader}>
                    <span className={styles.bottlePreviewTitle}>{t('bottlePreviewTitle')}</span>
                    <span className={styles.bottlePreviewCount}>
                      {safeBottles.length}{' '}
                      {safeBottles.length === 1 ? t('bottleCountSingular') : t('bottleCountPlural')}
                    </span>
                  </div>

                  <div className={styles.bottlePreviewStrip} aria-label={t('bottlePreviewTitle')}>
                    {safeBottles.length === 0 ? (
                      <div className={styles.bottlePreviewEmpty}>{t('bottlePreviewEmpty')}</div>
                    ) : (
                      safeBottles.map((bottle, index) => (
                        <article key={bottle.id} className={styles.bottlePreviewCard}>
                          <span className={styles.bottlePreviewIndex}>#{index + 1}</span>
                          <h4 className={styles.bottlePreviewName}>
                            {bottle.name || t('unknownBottle')}
                          </h4>
                          <p className={styles.bottlePreviewProducer}>
                            {bottle.producer || t('unknownProducer')}
                          </p>
                          {bottle.year && (
                            <span className={styles.bottlePreviewYear}>{bottle.year}</span>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          }
        />

        <div className={`${styles.actions} ${styles.actionsFixed}`}>
          <button
            onClick={handleStartGame}
            disabled={playersCount < 1 || isStartingGame}
            className={styles.startButton}>
            {isStartingGame ? t('starting') : t('startGame')} ({playersCount} {t('players')})
          </button>
          <button onClick={handleCancel} className={styles.cancelButton}>
            {t('cancel')}
          </button>
        </div>
      </div>

      {qrOpen && (
        <div className={styles.qrOverlay} onClick={() => setQrOpen(false)}>
          <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <img src="/logo.svg" alt="Indovinando" className={styles.qrLogo} />
            <h3>{qrTitle}</h3>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR sessione" className={styles.qrImage} />
            ) : (
              <p className={styles.qrHint}>{t('qrLoading')}</p>
            )}
            <div className={styles.qrActions}>
              <button className={styles.startButton} onClick={handlePrintQr}>
                {t('print')}
              </button>
              <button className={styles.cancelButton} onClick={() => setQrOpen(false)}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
