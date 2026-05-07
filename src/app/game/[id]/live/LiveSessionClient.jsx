'use client'

import {useEffect, useState, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import {supabaseClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import styles from './liveSessions.module.scss'

export default function LiveSessionClient({gameId, gameName, questions, bottles, userId}) {
  const router = useRouter()
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionLink, setSessionLink] = useState('')
  const [playersCount, setPlayersCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Crea sessione live al caricamento
  useEffect(() => {
    const createSession = async () => {
      try {
        const {data, error} = await supabaseClient
          .from('live_sessions')
          .insert({
            game_id: gameId,
            host_user_id: userId,
            status: 'lobby',
            current_question_index: 0,
            round_status: 'waiting_players',
          })
          .select()
          .single()

        if (error) throw error

        setSessionId(data.id)

        // Genera link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        setSessionLink(`${baseUrl}/live/session/${data.id}`)

        setLoading(false)
      } catch (err) {
        console.error('Error creating live session:', err)
        setLoading(false)
      }
    }

    createSession()
  }, [gameId, userId])

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
      const {data: existingHostPlayer} = await supabaseClient
        .from('live_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (!existingHostPlayer) {
        const hostNickname = 'Host'
        await supabaseClient.from('live_players').insert({
          session_id: sessionId,
          nickname: hostNickname,
          avatar_id: 1,
          user_id: userId,
          is_host: true,
        })
      }

      // Aggiorna sessione: cambio status a 'playing'
      await supabaseClient
        .from('live_sessions')
        .update({
          status: 'playing',
          started_at: new Date().toISOString(),
          round_status: 'waiting_answers',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      // Host e giocatori condividono la stessa esperienza di gioco.
      router.push(`/live/session/${sessionId}/play`)
    } catch (err) {
      console.error('Error starting game:', err)
    }
  }

  const handleCancel = async () => {
    try {
      // Elimina sessione
      await supabaseClient.from('live_sessions').delete().eq('id', sessionId)

      router.push('/dashboard')
    } catch (err) {
      console.error('Error canceling session:', err)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <Loader label="Creazione sessione" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <TopBar title={gameName} />

      <div className={styles.lobbyCard}>
        <div className={styles.section}>
          <h2>Link di Invito</h2>
          <div className={styles.linkBox}>
            <input type="text" readOnly value={sessionLink} className={styles.linkInput} />
            <button onClick={handleCopyLink} className={styles.copyButton}>
              {copyFeedback ? '✓ Copiato!' : 'Copia'}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Partecipanti: {playersCount}</h2>
          <p className={styles.info}>
            Aspetta che i giocatori si uniscano, poi premi Inizia Gioco.
          </p>
        </div>

        <div className={styles.section}>
          <h3>ℹ️ Dettagli Gioco</h3>
          <ul>
            <li>📋 Domande: {questions.length}</li>
            <li>🍾 Bottiglie: {bottles.length}</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleStartGame}
            disabled={playersCount < 1}
            className={styles.startButton}>
            Inizia Gioco ({playersCount} giocatori)
          </button>
          <button onClick={handleCancel} className={styles.cancelButton}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
