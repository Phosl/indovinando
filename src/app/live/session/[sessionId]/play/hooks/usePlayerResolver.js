import {useState, useCallback, useEffect} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

/**
 * Resolves the current player record from localStorage / Supabase.
 * Auto-creates a host record when isHostUser=true and no record is found.
 */
export function usePlayerResolver({sessionId, userId, isHostUser}) {
  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`

  const [playerData, setPlayerData] = useState(null)
  const [resolvingPlayer, setResolvingPlayer] = useState(true)

  const resolvePlayer = useCallback(async () => {
    const storedPlayerId = localStorage.getItem(playerStorageKey)
    const storedNickname = localStorage.getItem(nicknameStorageKey)

    // 1. Try by stored ID
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
        localStorage.setItem(nicknameStorageKey, byId.nickname)
        setPlayerData(byId)
        setResolvingPlayer(false)
        return
      }
    }

    // 2. Try by authenticated user_id
    if (userId) {
      const {data: byUser} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, user_id, is_host')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (byUser) {
        localStorage.setItem(playerStorageKey, byUser.id)
        localStorage.setItem(nicknameStorageKey, byUser.nickname)
        setPlayerData(byUser)
        setResolvingPlayer(false)
        return
      }
    }

    // 3. Try by stored nickname
    if (storedNickname) {
      const {data: byNickname} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, user_id, is_host')
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
        setPlayerData(byNickname)
      }
    }

    // 4. Auto-create host record
    if (isHostUser) {
      const {data: created, error: createErr} = await supabaseClient
        .from('live_players')
        .insert({
          session_id: sessionId,
          nickname: 'Host',
          avatar_id: 1,
          user_id: userId,
          is_host: true,
        })
        .select('id, nickname, avatar_id, user_id, is_host')
        .maybeSingle()

      if (!createErr && created) {
        localStorage.setItem(playerStorageKey, created.id)
        localStorage.setItem(nicknameStorageKey, created.nickname)
        setPlayerData(created)
      }
    }

    setResolvingPlayer(false)
  }, [isHostUser, nicknameStorageKey, playerStorageKey, sessionId, userId])

  useEffect(() => {
    resolvePlayer()
  }, [resolvePlayer])

  return {
    playerData,
    setPlayerData,
    resolvingPlayer,
    resolvePlayer,
    playerStorageKey,
    nicknameStorageKey,
  }
}
