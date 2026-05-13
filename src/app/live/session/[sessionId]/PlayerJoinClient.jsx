'use client'

import {useState, useEffect, useMemo} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import AvatarDisplay from '@/components/AvatarDisplay'
import {GAME_AVATARS, profileAvatarToGameId} from '@/lib/avatarUtils'
import styles from './playerJoin.module.scss'
import {useT} from '@/lib/i18n/useT'

const AVATAR_SVG_LIST = GAME_AVATARS.filter((a) => a.type === 'img')
const AVATAR_EMOJI_LIST = GAME_AVATARS.filter((a) => a.type === 'emoji')

export default function PlayerJoinClient({sessionId, gameName, existingPlayers, userId}) {
  const router = useRouter()
  const t = useT('live.playerJoin')
  const [nickname, setNickname] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(11) // default to first SVG
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [players, setPlayers] = useState(existingPlayers)
  const [joinedPlayer, setJoinedPlayer] = useState(null)
  const [copied, setCopied] = useState(false)

  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`
  const authReturnUrl = `/auth?next=${encodeURIComponent(`/live/session/${sessionId}`)}`
  const sessionLink = useMemo(() => {
    if (typeof window === 'undefined') return `/live/session/${sessionId}`
    return `${window.location.origin}/live/session/${sessionId}`
  }, [sessionId])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
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

  // Preselect profile avatar for logged-in users (only if not already restored from session)
  useEffect(() => {
    if (!userId || joinedPlayer) return
    supabaseClient
      .from('profiles')
      .select('avatar_emoji')
      .eq('id', userId)
      .single()
      .then(({data}) => {
        if (data?.avatar_emoji) {
          const gameId = profileAvatarToGameId(data.avatar_emoji)
          setSelectedAvatar(gameId)
        }
      })
  }, [userId, joinedPlayer])

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
      setError(t('enterNickname'))
      return
    }

    if (nickname.trim().length < 2) {
      setError(t('nicknameMin'))
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
        setError(t('nicknameTaken'))
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
      setError(t('joinError'))
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <TopBar title={`🎮 ${gameName}`} onBack={() => router.push('/')}></TopBar>

      {gameStarted ? (
        <div className={styles.waitingCard}>
          <h2>{t('gameStartingTitle')}</h2>
          <p>{t('gameStartingDesc')}</p>
        </div>
      ) : (
        <div className={styles.joinCard}>
          <div className={styles.inviteCard}>
            <h3>{t('shareTitle')}</h3>
            <p>{t('shareHint')}</p>
            <label className={styles.linkLabel} htmlFor="live-session-link">
              {t('sessionLinkLabel')}
            </label>
            <div className={styles.linkRow}>
              <input
                id="live-session-link"
                className={styles.linkInput}
                value={sessionLink}
                readOnly
              />
              <button type="button" className={styles.shareButton} onClick={handleCopyLink}>
                {copied ? t('copied') : t('copyLink')}
              </button>
              <button type="button" className={styles.shareButton} onClick={handleShareLink}>
                {t('shareLink')}
              </button>
            </div>
          </div>

          {!joinedPlayer ? (
            <form onSubmit={handleJoin} className={styles.joinForm}>
              <div className={styles.formGroup}>
                <label>{t('chooseAvatar')}</label>
                <div className={styles.avatarGridSvg}>
                  {AVATAR_SVG_LIST.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`${styles.avatarButton} ${selectedAvatar === av.id ? styles.selected : ''}`}
                      onClick={() => setSelectedAvatar(av.id)}></button>
                  ))}
                </div>
                <div className={styles.avatarGridEmoji}>
                  {AVATAR_EMOJI_LIST.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`${styles.avatarButton} ${selectedAvatar === av.id ? styles.selected : ''}`}
                      onClick={() => setSelectedAvatar(av.id)}>
                      <span className={styles.avatarEmoji}>{av.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="nickname">{t('nicknameLabel')}</label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('nicknamePlaceholder')}
                  className={styles.input}
                  disabled={loading}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.joinButton} disabled={loading}>
                {loading ? t('joining') : t('joinGame')}
              </button>

              {!userId && (
                <button
                  type="button"
                  className={styles.authButton}
                  onClick={() => router.push(authReturnUrl)}
                  disabled={loading}>
                  {t('loginOptional')}
                </button>
              )}
            </form>
          ) : (
            <div className={styles.waitingJoinStart}>
              <h2>{t('joinedAs', {nickname: joinedPlayer.nickname})}</h2>
              <p>{t('waitHostStart')}</p>
            </div>
          )}

          <div className={styles.playersList}>
            <h3>
              {t('connectedPlayers')} ({players.length})
            </h3>
            <div className={styles.playersGrid}>
              {players.map((player, idx) => (
                <div key={idx} className={styles.playerCard}>
                  <span className={styles.emoji}>
                    <AvatarDisplay avatarId={player.avatar_id} size={28} />
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
