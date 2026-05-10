'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import {supabaseClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import styles from './liveSessions.module.scss'

const withSaveTimeout = async (promise, contextLabel, timeoutMs = 20000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Salvataggio lento. (${contextLabel}). Riprova.`))
    }, timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
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

  // Crea sessione live al caricamento
  useEffect(() => {
    const createSession = async () => {
      try {
        const {data, error} = await withSaveTimeout(
          supabaseClient
            .from('live_sessions')
            .insert({
              game_id: gameId,
              host_user_id: userId,
              status: 'lobby',
              current_question_index: 0,
              round_status: 'waiting_players',
            })
            .select()
            .single(),
          'create-live-session',
        )

        if (error) throw error

        setSessionId(data.id)

        // Genera link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        setSessionLink(`${baseUrl}/live/session/${data.id}`)

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
      const {count} = await supabaseClient
        .from('live_players')
        .select('*', {count: 'exact', head: true})
        .eq('session_id', sessionId)

      setPlayersCount(count || 0)
    }, 1000) // Poll ogni 1 secondo

    return () => clearInterval(pollPlayers)
  }, [sessionId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sessionLink)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const handleStartGame = async () => {
    try {
      // Ensure host partecipa come giocatore nella stessa sessione.
      const {data: existingHostPlayer} = await withSaveTimeout(
        supabaseClient
          .from('live_players')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle(),
        'check-host-player',
      )

      if (!existingHostPlayer) {
        const hostNickname = 'Host'
        await withSaveTimeout(
          supabaseClient.from('live_players').insert({
            session_id: sessionId,
            nickname: hostNickname,
            avatar_id: 1,
            user_id: userId,
            is_host: true,
          }),
          'insert-host-player',
        )
      }

      // Aggiorna sessione: cambio status a 'playing'
      await withSaveTimeout(
        supabaseClient
          .from('live_sessions')
          .update({
            status: 'playing',
            started_at: new Date().toISOString(),
            round_status: 'waiting_answers',
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId),
        'start-game-session',
      )

      // Host e players share the same game experience
      router.push(`/live/session/${sessionId}/play`)
    } catch (err) {
      console.error('Error starting game:', err)
      alert(
        isEnglish
          ? 'Failed to start game. Please try again.'
          : "Errore nell'avvio del gioco. Riprova.",
      )
    }
  }

  const handleCancel = async () => {
    try {
      // Elimina sessione
      await withSaveTimeout(
        supabaseClient.from('live_sessions').delete().eq('id', sessionId),
        'cancel-live-session',
      )

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
            disabled={playersCount < 1}
            className={styles.startButton}>
            {isEnglish ? 'Start Game' : 'Inizia Gioco'} ({playersCount}{' '}
            {isEnglish ? 'players' : 'giocatori'})
          </button>
          <button onClick={handleCancel} className={styles.cancelButton}>
            {isEnglish ? 'Cancel' : 'Annulla'}
          </button>
        </div>
      </div>
    </div>
  )
}
