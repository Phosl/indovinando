'use client'

import {useState, useEffect, useMemo, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import AvatarDisplay from '@/components/AvatarDisplay'
import {GAME_AVATARS, profileAvatarToGameId} from '@/lib/avatarUtils'
import {buildPublicAppUrl} from '@/lib/publicAppUrl'
import styles from './playerJoin.module.scss'
import {useT} from '@/lib/i18n/useT'
import Loader from '@/components/Loader'

const AVATAR_SVG_LIST = GAME_AVATARS.filter((a) => a.type === 'img')
const AVATAR_EMOJI_LIST = GAME_AVATARS.filter((a) => a.type === 'emoji')

export default function PlayerJoinClient({sessionId, gameName, existingPlayers, userId, tableJoinCode}) {
  const router = useRouter()
  const t = useT('live.playerJoin')
  const [nickname, setNickname] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(11) // default to first SVG
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [players, setPlayers] = useState(existingPlayers)
  const [joinedPlayer, setJoinedPlayer] = useState(null)
  const [copied, setCopied] = useState(false)

  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`
  const authReturnUrl = `/auth?next=${encodeURIComponent(`/live/session/${sessionId}`)}`
  const sessionLink = useMemo(() => buildPublicAppUrl(`/live/session/${sessionId}`), [sessionId])

  const refreshLobbyState = useCallback(async () => {
    const [sessionResult, playersResult] = await Promise.all([
      supabaseClient.from('live_sessions').select('status').eq('id', sessionId).maybeSingle(),
      supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, user_id')
        .eq('session_id', sessionId)
        .order('joined_at'),
    ])

    const nextPlayers = Array.isArray(playersResult.data) ? playersResult.data : []
    setPlayers(nextPlayers)

    if (sessionResult.data?.status === 'playing') {
      setGameStarted(true)
    }

    return {
      session: sessionResult.data,
      players: nextPlayers,
    }
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
      try {
        setRestoring(true)
        const storedPlayerId = localStorage.getItem(playerStorageKey)
        const storedNickname = localStorage.getItem(nicknameStorageKey)
        const {session} = await refreshLobbyState()
        const alreadyPlaying = session?.status === 'playing'

        const adoptPlayer = async (player) => {
          if (!player) return false

          if (userId && !player.user_id) {
            await supabaseClient.from('live_players').update({user_id: userId}).eq('id', player.id)
            player.user_id = userId
          }

          localStorage.setItem(playerStorageKey, player.id)
          localStorage.setItem(nicknameStorageKey, player.nickname)

          if (alreadyPlaying) {
            router.replace(`/live/session/${sessionId}/play`)
            return true
          }

          setJoinedPlayer(player)
          setNickname(player.nickname)
          setSelectedAvatar(player.avatar_id)
          return true
        }

        if (storedPlayerId) {
          const {data: byId} = await supabaseClient
            .from('live_players')
            .select('id, nickname, avatar_id, user_id')
            .eq('id', storedPlayerId)
            .eq('session_id', sessionId)
            .maybeSingle()

          if (await adoptPlayer(byId)) return
        }

        if (userId) {
          const {data: byUser} = await supabaseClient
            .from('live_players')
            .select('id, nickname, avatar_id, user_id')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle()

          if (await adoptPlayer(byUser)) return
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

          await adoptPlayer(byNickname)
        }
      } finally {
        setRestoring(false)
      }
    }

    restorePlayer()
  }, [nicknameStorageKey, playerStorageKey, refreshLobbyState, router, sessionId, userId])

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
      try {
        await refreshLobbyState()
      } catch {
        // Keep current UI state and try again on the next tick.
      }
    }, 2000) // Aumentato a 2000ms per ridurre carico DB

    refreshLobbyState().catch(() => {})

    return () => clearInterval(pollCombined)
  }, [refreshLobbyState])

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
        .maybeSingle()

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
      setPlayers((prev) => {
        const nextPlayers = Array.isArray(prev) ? prev : []
        return nextPlayers.some((player) => player.id === data.id) ? nextPlayers : [...nextPlayers, data]
      })

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
      <TopBar title={`${gameName}`} onBack={() => router.push('/')}></TopBar>

      {tableJoinCode ? (
        <div className={styles.tableCodeBanner}>
          <span className={styles.tableCodeLabel}>{t('sessionCodeLabel')}</span>
          <strong className={styles.tableCodeValue}>{tableJoinCode}</strong>
        </div>
      ) : null}

      {restoring ? (
        <div className={styles.waitingCard}>
          <Loader label={t('restoringAccess')} />
          <p>{t('restoringAccessHint')}</p>
        </div>
      ) : gameStarted ? (
        <div className={styles.waitingCard}>
          <h2>{t('gameStartingTitle')}</h2>
          <p>{t('gameStartingDesc')}</p>
        </div>
      ) : (
        <div className={styles.joinCard}>
          {!joinedPlayer ? (
            <form onSubmit={handleJoin} className={styles.joinForm}>
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

              <div className={styles.formGroup}>
                <label>{t('chooseAvatar')}</label>
                <div className={styles.avatarGridSvg}>
                  {AVATAR_SVG_LIST.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`${styles.avatarButton} ${selectedAvatar === av.id ? styles.selected : ''}`}
                      onClick={() => setSelectedAvatar(av.id)}>
                      <img
                        src={av.value}
                        alt=""
                        className={styles.avatarSvgThumb}
                        aria-hidden="true"
                      />
                    </button>
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
          <div className={styles.inviteCard}>
            <h3>{t('shareTitle')}</h3>
            <p>{t('shareHint')}</p>

            <div className={styles.linkRow}>
              <button type="button" className={styles.shareButton} onClick={handleCopyLink}>
                {copied ? t('copied') : t('copyLink')}
              </button>
              <button type="button" className={styles.shareButton} onClick={handleShareLink}>
                {t('shareLink')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
