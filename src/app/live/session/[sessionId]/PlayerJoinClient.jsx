'use client'

import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import styles from './playerJoin.module.scss'

const APPLE_AVATARS = [
  {id: 1, emoji: '👨‍💼'},
  {id: 2, emoji: '👩‍💼'},
  {id: 3, emoji: '👨‍🎓'},
  {id: 4, emoji: '👩‍🎓'},
  {id: 5, emoji: '👨‍🎨'},
  {id: 6, emoji: '👩‍🎨'},
  {id: 7, emoji: '👨‍🚀'},
  {id: 8, emoji: '👩‍🚀'},
  {id: 9, emoji: '🧑‍🍳'},
  {id: 10, emoji: '👨‍⚕️'},
]

export default function PlayerJoinClient({sessionId, gameName, existingPlayers, userId}) {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [players, setPlayers] = useState(existingPlayers)
  const [joinedPlayer, setJoinedPlayer] = useState(null)

  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`
  const authReturnUrl = `/auth?next=${encodeURIComponent(`/live/session/${sessionId}`)}`

  useEffect(() => {
    const restorePlayer = async () => {
      const storedPlayerId = localStorage.getItem(playerStorageKey)
      const storedNickname = localStorage.getItem(nicknameStorageKey)

      // Check session status alongside player lookup so we can redirect immediately
      const {data: session} = await supabaseClient
        .from('live_sessions')
        .select('status')
        .eq('id', sessionId)
        .maybeSingle()
      const alreadyPlaying = session?.status === 'playing'

      if (storedPlayerId) {
        const {data: byId} = await supabaseClient
          .from('live_players')
          .select('id, nickname, avatar_id, user_id')
          .eq('id', storedPlayerId)
          .eq('session_id', sessionId)
          .maybeSingle()

        if (byId) {
          if (userId && !byId.user_id) {
            await supabaseClient.from('live_players').update({user_id: userId}).eq('id', byId.id)
            byId.user_id = userId
          }

          if (alreadyPlaying) {
            router.replace(`/live/session/${sessionId}/play`)
            return
          }
          setJoinedPlayer(byId)
          setNickname(byId.nickname)
          setSelectedAvatar(byId.avatar_id)
          return
        }
      }

      if (userId) {
        const {data: byUser} = await supabaseClient
          .from('live_players')
          .select('id, nickname, avatar_id, user_id')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()

        if (byUser) {
          localStorage.setItem(playerStorageKey, byUser.id)
          localStorage.setItem(nicknameStorageKey, byUser.nickname)
          if (alreadyPlaying) {
            router.replace(`/live/session/${sessionId}/play`)
            return
          }
          setJoinedPlayer(byUser)
          setNickname(byUser.nickname)
          setSelectedAvatar(byUser.avatar_id)
          return
        }
      }

      if (storedNickname) {
        const {data: byNickname} = await supabaseClient
          .from('live_players')
          .select('id, nickname, avatar_id, user_id')
          .eq('session_id', sessionId)
          .eq('nickname', storedNickname)
          .order('joined_at', {ascending: false})
          .limit(1)
          .maybeSingle()

        if (byNickname) {
          if (userId && !byNickname.user_id) {
            await supabaseClient
              .from('live_players')
              .update({user_id: userId})
              .eq('id', byNickname.id)
            byNickname.user_id = userId
          }

          localStorage.setItem(playerStorageKey, byNickname.id)
          setJoinedPlayer(byNickname)
          setNickname(byNickname.nickname)
          setSelectedAvatar(byNickname.avatar_id)
        }
      }
    }

    restorePlayer()
  }, [nicknameStorageKey, playerStorageKey, sessionId, userId])

  // Polling combinato - controlla stato gioco e aggiorna lista giocatori
  useEffect(() => {
    const pollCombined = setInterval(async () => {
      // Carica session status e giocatori in parallelo
      const [sessionResult, playersResult] = await Promise.all([
        supabaseClient.from('live_sessions').select('status').eq('id', sessionId).single(),
        supabaseClient
          .from('live_players')
          .select('nickname, avatar_id')
          .eq('session_id', sessionId)
          .order('joined_at'),
      ])

      if (sessionResult.data?.status === 'playing') {
        setGameStarted(true)
      }

      if (playersResult.data) {
        setPlayers(playersResult.data)
      }
    }, 2000) // Aumentato a 2000ms per ridurre carico DB

    return () => clearInterval(pollCombined)
  }, [sessionId])

  // Se il gioco è iniziato, reindirizza alla pagina di gioco
  useEffect(() => {
    if (gameStarted) {
      const timer = setTimeout(() => {
        router.push(`/live/session/${sessionId}/play`)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [gameStarted, sessionId, router])

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')

    if (!nickname.trim()) {
      setError('Inserisci un nickname')
      return
    }

    if (nickname.trim().length < 2) {
      setError('Il nickname deve essere almeno 2 caratteri')
      return
    }

    setLoading(true)

    try {
      // Check se esiste già questo nickname
      const {data: existing} = await supabaseClient
        .from('live_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('nickname', nickname.trim())
        .single()

      if (existing) {
        setError('Questo nickname è già usato nel gioco!')
        setLoading(false)
        return
      }

      // Inserisci giocatore
      const {data, error: insertError} = await supabaseClient
        .from('live_players')
        .insert({
          session_id: sessionId,
          nickname: nickname.trim(),
          avatar_id: selectedAvatar,
          user_id: userId,
        })
        .select()
        .single()

      if (insertError) throw insertError

      localStorage.setItem(playerStorageKey, data.id)
      localStorage.setItem(nicknameStorageKey, data.nickname)
      setJoinedPlayer(data)
      setNickname(data.nickname)

      // Reindirizza a waiting room (stessa pagina ma in attesa)
      setLoading(false)
      // Aspetta polling per rilevare inizio gioco
    } catch (err) {
      console.error('Error joining game:', err)
      setError("Errore durante l'accesso al gioco")
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <TopBar back={null} title={`🎮 ${gameName}`} />

      {gameStarted ? (
        <div className={styles.waitingCard}>
          <h2>🎉 Il gioco inizia...</h2>
          <p>Stai per entrare nel gioco!</p>
        </div>
      ) : (
        <div className={styles.joinCard}>
          {!joinedPlayer ? (
            <form onSubmit={handleJoin} className={styles.joinForm}>
              <div className={styles.formGroup}>
                <label>Scegli il tuo Avatar</label>
                <div className={styles.avatarGrid}>
                  {APPLE_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      className={`${styles.avatarButton} ${
                        selectedAvatar === avatar.id ? styles.selected : ''
                      }`}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      title={`Avatar ${avatar.id}`}>
                      <span className={styles.avatarEmoji}>{avatar.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="nickname">Nickname</label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Es: Marco, Anna..."
                  className={styles.input}
                  disabled={loading}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.joinButton} disabled={loading}>
                {loading ? 'Accesso in corso...' : 'Accedi al Gioco'}
              </button>

              {!userId && (
                <button
                  type="button"
                  className={styles.authButton}
                  onClick={() => router.push(authReturnUrl)}
                  disabled={loading}>
                  Registrati / Accedi (opzionale)
                </button>
              )}
            </form>
          ) : (
            <div className={styles.waitingJoinStart}>
              <h2>✅ Sei dentro come {joinedPlayer.nickname}</h2>
              <p>Attendi che l'host faccia partire il gioco.</p>
            </div>
          )}

          <div className={styles.playersList}>
            <h3>Giocatori Connessi ({players.length})</h3>
            <div className={styles.playersGrid}>
              {players.map((player, idx) => (
                <div key={idx} className={styles.playerCard}>
                  <span className={styles.emoji}>
                    {APPLE_AVATARS[player.avatar_id - 1]?.emoji || '👤'}
                  </span>
                  <p>{player.nickname}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
