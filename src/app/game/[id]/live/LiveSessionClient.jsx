'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import QRCode from 'qrcode'
import TopBar from '@/components/TopBar'
import ShareDetailsTabs from '@/components/ShareDetailsTabs/ShareDetailsTabs'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './liveSessions.module.scss'

const LIVE_SESSION_DICTIONARY = {
  it: {
    createFailed: 'Errore nella creazione sessione. Riprova.',
    startFailed: "Errore nell'avvio del gioco. Riprova.",
    cancelFailed: "Errore nell'annullamento. Riprova.",
    creatingSession: 'Creazione sessione',
    inviteLink: 'Link di Invito',
    inviteLinkTitle: 'Link invito',
    inviteLinkHint:
      'Condividi questo link con chi deve entrare nella sessione live: apre direttamente l\'accesso al gioco.',
    inviteLinkLabel: 'Link sessione live',
    shareTabLabel: 'Condivisione',
    detailsTabLabel: 'Dettaglio gioco',
    copied: '✓ Copiato!',
    copy: 'Copia',
    share: 'Condividi',
    qr: 'QR',
    qrTitle: 'QR sessione live',
    print: 'Stampa',
    close: 'Chiudi',
    participants: 'Partecipanti: ',
    waitPlayers: 'Aspetta che i giocatori si uniscano, poi premi Inizia Gioco.',
    gameDetails: 'Dettagli Gioco',
    questions: 'Domande',
    questionPreviewTitle: 'Domande del gioco',
    questionPreviewEmpty: 'Nessuna domanda ancora inserita.',
    unknownQuestion: 'Domanda senza testo',
    questionSingular: 'domanda',
    questionPlural: 'domande',
    bottles: 'Bottiglie',
    bottlePreviewTitle: 'Bottiglie del gioco',
    bottlePreviewEmpty: 'Nessuna bottiglia ancora inserita.',
    unknownBottle: 'Senza nome',
    unknownProducer: 'Produttore non indicato',
    starting: 'Avvio...',
    startGame: 'Inizia Gioco',
    players: 'giocatori',
    cancel: 'Annulla',
  },
  en: {
    createFailed: 'Failed to create session. Please try again.',
    startFailed: 'Failed to start game. Please try again.',
    cancelFailed: 'Failed to cancel session. Please try again.',
    creatingSession: 'Creating session',
    inviteLink: 'Invite Link',
    inviteLinkTitle: 'Invite link',
    inviteLinkHint:
      'Share this link with anyone joining the live session: it opens the game access screen directly.',
    inviteLinkLabel: 'Live session link',
    shareTabLabel: 'Share',
    detailsTabLabel: 'Game details',
    copied: '✓ Copied!',
    copy: 'Copy',
    share: 'Share',
    qr: 'QR',
    qrTitle: 'Live session QR',
    print: 'Print',
    close: 'Close',
    participants: 'Participants: ',
    waitPlayers: 'Wait for players to join, then click Start Game.',
    gameDetails: 'Game Details',
    questions: 'Questions',
    questionPreviewTitle: 'Game questions',
    questionPreviewEmpty: 'No questions added yet.',
    unknownQuestion: 'Question without text',
    questionSingular: 'question',
    questionPlural: 'questions',
    bottles: 'Bottles',
    bottlePreviewTitle: 'Game bottles',
    bottlePreviewEmpty: 'No bottles added yet.',
    unknownBottle: 'Unnamed',
    unknownProducer: 'Producer not specified',
    starting: 'Starting...',
    startGame: 'Start Game',
    players: 'players',
    cancel: 'Cancel',
  },
}

const withSaveTimeout = async (taskOrPromise, contextLabel, timeoutMs = 20000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Salvataggio lento. (${contextLabel}). Riprova.`))
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
  const {lang} = useLanguage()
  const t = pickLangText(lang, LIVE_SESSION_DICTIONARY)
  const safeQuestionsPreview = questionsPreview || []
  const safeBottles = bottles || []
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionLink, setSessionLink] = useState('')
  const [playersCount, setPlayersCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

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
        alert(t.createFailed)
        setLoading(false)
      }
    }

    createSession()
  }, [gameId, userId, t.createFailed])

  // Polling - ascolta i giocatori che si uniscono
  useEffect(() => {
    if (!sessionId) return

    const pollPlayers = setInterval(async () => {
      try {
        const response = await fetch('/api/live/session/players-count', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({sessionId}),
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) return

        setPlayersCount(payload?.count || 0)
      } catch {
        // Ignore transient polling errors and try again on next tick.
      }
    }, 1000) // Poll ogni 1 secondo

    return () => clearInterval(pollPlayers)
  }, [sessionId])

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
    if (!qrDataUrl) return

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
          <h1>${gameName}</h1>
          <img src="${qrDataUrl}" alt="QR" />
          <p>${sessionLink}</p>
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
      alert(t.startFailed)
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
      alert(t.cancelFailed)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <TopBar title={t.creatingSession} onBack={() => router.push('/miei-giochi')} />
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
          shareLabel={t.shareTabLabel}
          detailsLabel={t.detailsTabLabel}
          shareContent={
            <>
              <div className={styles.section}>
                <p className={styles.bridgeTitle}>{t.inviteLinkTitle}</p>
                <p className={styles.bridgeHint}>{t.inviteLinkHint}</p>
                <label className={styles.linkLabel} htmlFor="live-session-link">
                  {t.inviteLinkLabel}
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
                      {copyFeedback ? t.copied : t.copy}
                    </button>
                    <button onClick={handleShareLink} className={styles.copyButton}>
                      {t.share}
                    </button>
                    <button onClick={() => setQrOpen(true)} className={styles.copyButton}>
                      {t.qr}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2>
                  {t.participants}
                  {playersCount}
                </h2>
                <p className={styles.info}>{t.waitPlayers}</p>
              </div>
            </>
          }
          detailsContent={
            <>
              <div className={styles.section}>
                <div className={styles.questionPreviewBlock}>
                  <div className={styles.questionPreviewHeader}>
                    <span className={styles.questionPreviewTitle}>{t.questionPreviewTitle}</span>
                    <span className={styles.questionPreviewCount}>
                      {safeQuestionsPreview.length}{' '}
                      {safeQuestionsPreview.length === 1 ? t.questionSingular : t.questionPlural}
                    </span>
                  </div>

                  <div className={styles.questionPreviewStrip} aria-label={t.questionPreviewTitle}>
                    {safeQuestionsPreview.length === 0 ? (
                      <div className={styles.questionPreviewEmpty}>{t.questionPreviewEmpty}</div>
                    ) : (
                      safeQuestionsPreview.map((question, index) => (
                        <article key={question.id} className={styles.questionPreviewCard}>
                          <h4 className={styles.questionPreviewText}>
                            {question.text || t.unknownQuestion}
                          </h4>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.bottlePreviewBlock}>
                  <div className={styles.bottlePreviewHeader}>
                    <span className={styles.bottlePreviewTitle}>{t.bottlePreviewTitle}</span>
                    <span className={styles.bottlePreviewCount}>
                      {safeBottles.length}{' '}
                      {safeBottles.length === 1 ? t.bottleCountSingular : t.bottleCountPlural}
                    </span>
                  </div>

                  <div className={styles.bottlePreviewStrip} aria-label={t.bottlePreviewTitle}>
                    {safeBottles.length === 0 ? (
                      <div className={styles.bottlePreviewEmpty}>{t.bottlePreviewEmpty}</div>
                    ) : (
                      safeBottles.map((bottle, index) => (
                        <article key={bottle.id} className={styles.bottlePreviewCard}>
                          <span className={styles.bottlePreviewIndex}>#{index + 1}</span>
                          <h4 className={styles.bottlePreviewName}>
                            {bottle.name || t.unknownBottle}
                          </h4>
                          <p className={styles.bottlePreviewProducer}>
                            {bottle.producer || t.unknownProducer}
                          </p>
                          {bottle.year && <span className={styles.bottlePreviewYear}>{bottle.year}</span>}
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
            {isStartingGame ? t.starting : t.startGame} ({playersCount} {t.players})
          </button>
          <button onClick={handleCancel} className={styles.cancelButton}>
            {t.cancel}
          </button>
        </div>
      </div>

      {qrOpen && (
        <div className={styles.qrOverlay} onClick={() => setQrOpen(false)}>
          <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <img src="/logo.svg" alt="Indovinando" className={styles.qrLogo} />
            <h3>{t.qrTitle}</h3>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR sessione" className={styles.qrImage} />
            ) : (
              <p className={styles.qrHint}>Loading...</p>
            )}
            <div className={styles.qrActions}>
              <button className={styles.startButton} onClick={handlePrintQr}>
                {t.print}
              </button>
              <button className={styles.cancelButton} onClick={() => setQrOpen(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
