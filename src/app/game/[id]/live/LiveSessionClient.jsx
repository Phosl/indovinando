'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
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
    copied: '✓ Copiato!',
    copy: 'Copia',
    share: 'Condividi',
    participants: 'Partecipanti: ',
    waitPlayers: 'Aspetta che i giocatori si uniscano, poi premi Inizia Gioco.',
    gameDetails: 'Dettagli Gioco',
    questions: 'Domande',
    bottles: 'Bottiglie',
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
    copied: '✓ Copied!',
    copy: 'Copy',
    share: 'Share',
    participants: 'Participants: ',
    waitPlayers: 'Wait for players to join, then click Start Game.',
    gameDetails: 'Game Details',
    questions: 'Questions',
    bottles: 'Bottles',
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

export default function LiveSessionClient({gameId, gameName, questions, bottles, userId}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const t = pickLangText(lang, LIVE_SESSION_DICTIONARY)
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionLink, setSessionLink] = useState('')
  const [playersCount, setPlayersCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [isStartingGame, setIsStartingGame] = useState(false)

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

      router.push('/dashboard')
    } catch (err) {
      console.error('Error canceling session:', err)
      alert(t.cancelFailed)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <TopBar title={t.creatingSession} />
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
      <TopBar title={gameName} />

      <div className={styles.lobbyCard}>
        <div className={styles.section}>
          <h2>{t.inviteLink}</h2>
          <div className={styles.linkBox}>
            <input type="text" readOnly value={sessionLink} className={styles.linkInput} />
            <button onClick={handleCopyLink} className={styles.copyButton}>
              {copyFeedback ? t.copied : t.copy}
            </button>
            <button onClick={handleShareLink} className={styles.copyButton}>
              {t.share}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2>
            {t.participants}
            {playersCount}
          </h2>
          <p className={styles.info}>{t.waitPlayers}</p>
        </div>

        <div className={styles.section}>
          <h3>ℹ️ {t.gameDetails}</h3>
          <ul>
            <li>
              📋 {t.questions}: {questions.length}
            </li>
            <li>
              🍾 {t.bottles}: {bottles.length}
            </li>
          </ul>
        </div>

        <div className={styles.actions}>
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
    </div>
  )
}
