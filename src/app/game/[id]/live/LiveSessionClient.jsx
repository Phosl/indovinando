'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './liveSessions.module.scss'

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
  const isEnglish = lang === 'en'
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
        alert(
          isEnglish
            ? 'Failed to create session. Please try again.'
            : 'Errore nella creazione sessione. Riprova.',
        )
        setLoading(false)
      }
    }

    createSession()
  }, [gameId, userId, isEnglish])

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
      alert(
        isEnglish
          ? 'Failed to start game. Please try again.'
          : "Errore nell'avvio del gioco. Riprova.",
      )
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
      alert(
        isEnglish
          ? 'Failed to cancel session. Please try again.'
          : "Errore nell'annullamento. Riprova.",
      )
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <Loader label={isEnglish ? 'Creating session' : 'Creazione sessione'} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <TopBar title={gameName} />

      <div className={styles.lobbyCard}>
        <div className={styles.section}>
          <h2>{isEnglish ? 'Invite Link' : 'Link di Invito'}</h2>
          <div className={styles.linkBox}>
            <input type="text" readOnly value={sessionLink} className={styles.linkInput} />
            <button onClick={handleCopyLink} className={styles.copyButton}>
              {copyFeedback
                ? isEnglish
                  ? '✓ Copied!'
                  : '✓ Copiato!'
                : isEnglish
                  ? 'Copy'
                  : 'Copia'}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2>
            {isEnglish ? 'Participants: ' : 'Partecipanti: '}
            {playersCount}
          </h2>
          <p className={styles.info}>
            {isEnglish
              ? 'Wait for players to join, then click Start Game.'
              : 'Aspetta che i giocatori si uniscano, poi premi Inizia Gioco.'}
          </p>
        </div>

        <div className={styles.section}>
          <h3>ℹ️ {isEnglish ? 'Game Details' : 'Dettagli Gioco'}</h3>
          <ul>
            <li>
              📋 {isEnglish ? 'Questions' : 'Domande'}: {questions.length}
            </li>
            <li>
              🍾 {isEnglish ? 'Bottles' : 'Bottiglie'}: {bottles.length}
            </li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleStartGame}
            disabled={playersCount < 1 || isStartingGame}
            className={styles.startButton}>
            {isStartingGame
              ? isEnglish
                ? 'Starting...'
                : 'Avvio...'
              : isEnglish
                ? 'Start Game'
                : 'Inizia Gioco'}{' '}
            ({playersCount} {isEnglish ? 'players' : 'giocatori'})
          </button>
          <button onClick={handleCancel} className={styles.cancelButton}>
            {isEnglish ? 'Cancel' : 'Annulla'}
          </button>
        </div>
      </div>
    </div>
  )
}
