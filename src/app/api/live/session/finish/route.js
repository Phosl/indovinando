import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key)
    return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

export async function POST(request) {
  try {
    const {sessionId} = await request.json()
    const trimmedSessionId = String(sessionId ?? '').trim()

    if (!trimmedSessionId) {
      return NextResponse.json({error: 'Missing session id'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const db = createWriteClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('live_sessions')
      .select('id, host_user_id, status, game_id, current_question_index, round_status')
      .eq('id', trimmedSessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const {data: actorPlayer, error: actorPlayerError} = await db
      .from('live_players')
      .select('id')
      .eq('session_id', trimmedSessionId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (actorPlayerError) {
      return NextResponse.json({error: actorPlayerError.message}, {status: 500})
    }

    if (!actorPlayer) {
      return NextResponse.json(
        {error: 'Only session participants can finish this session'},
        {status: 403},
      )
    }

    if (session.status === 'finished') {
      return NextResponse.json({ok: true, sessionId: trimmedSessionId, alreadyFinished: true})
    }

    if (session.round_status === 'showing_results') {
      return NextResponse.json({ok: true, sessionId: trimmedSessionId, pending: true})
    }

    if (session.status !== 'finished') {
      const currentBottleIndex = Math.max(0, Number(session.current_question_index || 0))

      const {data: currentBottleRows, error: bottleError} = await db
        .from('game_bottles')
        .select('id')
        .eq('game_id', session.game_id)
        .order('bottle_order')
        .range(currentBottleIndex, currentBottleIndex)

      if (bottleError || !currentBottleRows?.length) {
        return NextResponse.json(
          {error: bottleError?.message || 'Current bottle not found'},
          {status: 400},
        )
      }

      const currentBottleId = currentBottleRows[0].id

      const {data: bottleQuestions, error: bottleQuestionsError} = await db
        .from('game_bottle_answers')
        .select('question_id')
        .eq('bottle_id', currentBottleId)

      if (bottleQuestionsError || !bottleQuestions?.length) {
        return NextResponse.json(
          {error: bottleQuestionsError?.message || 'Bottle questions not found'},
          {status: 400},
        )
      }

      const questionIds = [
        ...new Set(bottleQuestions.map((row) => row.question_id).filter(Boolean)),
      ]

      const {data: players, error: playersListError} = await db
        .from('live_players')
        .select('id, nickname')
        .eq('session_id', trimmedSessionId)

      if (playersListError) {
        return NextResponse.json({error: playersListError.message}, {status: 500})
      }

      const {data: submittedAnswers, error: submittedAnswersError} = await db
        .from('live_round_answers')
        .select('player_id, question_id')
        .eq('session_id', trimmedSessionId)
        .in('question_id', questionIds)

      if (submittedAnswersError) {
        return NextResponse.json({error: submittedAnswersError.message}, {status: 500})
      }

      const answeredByPlayer = {}
      ;(submittedAnswers || []).forEach((answer) => {
        if (!answer.player_id || !answer.question_id) return
        if (!answeredByPlayer[answer.player_id]) answeredByPlayer[answer.player_id] = new Set()
        answeredByPlayer[answer.player_id].add(answer.question_id)
      })

      const requiredAnswersCount = questionIds.length
      const incompletePlayers = (players || []).filter((player) => {
        const answered = answeredByPlayer[player.id]?.size || 0
        return answered < requiredAnswersCount
      })

      if (incompletePlayers.length > 0) {
        return NextResponse.json(
          {
            error: 'Final leaderboard is available only after all players complete the round',
            incompletePlayers: incompletePlayers.map((player) => player.nickname || player.id),
          },
          {status: 409},
        )
      }
    }

    const {data: lockRows, error: lockError} = await db
      .from('live_sessions')
      .update({round_status: 'showing_results', updated_at: new Date().toISOString()})
      .eq('id', trimmedSessionId)
      .neq('status', 'finished')
      .eq('round_status', 'waiting_answers')
      .select('id')

    if (lockError) {
      return NextResponse.json({error: lockError.message}, {status: 500})
    }

    if (!lockRows?.length) {
      return NextResponse.json({ok: true, sessionId: trimmedSessionId, pending: true})
    }

    // Apply last round points before finalizing the session.
    // This guarantees final leaderboard totals include the final bottle.
    const {data: pendingAnswers, error: answersError} = await db
      .from('live_round_answers')
      .select('player_id, points')
      .eq('session_id', trimmedSessionId)

    if (answersError) {
      return NextResponse.json({error: answersError.message}, {status: 500})
    }

    if (pendingAnswers?.length) {
      const roundPointsByPlayer = {}
      pendingAnswers.forEach((answer) => {
        const playerId = answer.player_id
        if (!playerId) return
        roundPointsByPlayer[playerId] =
          (roundPointsByPlayer[playerId] || 0) + Number(answer.points || 0)
      })

      const {data: players, error: playersError} = await db
        .from('live_players')
        .select('id, total_score')
        .eq('session_id', trimmedSessionId)

      if (playersError) {
        return NextResponse.json({error: playersError.message}, {status: 500})
      }

      if (players?.length) {
        const updates = players
          .map((player) => {
            const add = Number(roundPointsByPlayer[player.id] || 0)
            if (add <= 0) return null
            return db
              .from('live_players')
              .update({total_score: Number(player.total_score || 0) + add})
              .eq('id', player.id)
          })
          .filter(Boolean)

        if (updates.length) {
          const updateResults = await Promise.all(updates)
          const failedUpdate = updateResults.find((result) => result.error)
          if (failedUpdate?.error) {
            return NextResponse.json({error: failedUpdate.error.message}, {status: 500})
          }
        }
      }

      // Prevent double-apply if host retries finish action.
      const {error: clearAnswersError} = await db
        .from('live_round_answers')
        .delete()
        .eq('session_id', trimmedSessionId)

      if (clearAnswersError) {
        return NextResponse.json({error: clearAnswersError.message}, {status: 500})
      }
    }

    const finishedAt = new Date().toISOString()

    if (session.status !== 'finished') {
      const {error: finishError} = await db
        .from('live_sessions')
        .update({
          status: 'finished',
          finished_at: finishedAt,
          updated_at: finishedAt,
        })
        .eq('id', trimmedSessionId)

      if (finishError) {
        return NextResponse.json({error: finishError.message}, {status: 500})
      }
    }

    // ── Save permanent history snapshot ──────────────────────────────────────
    // Runs opportunistically — failure is non-fatal (game already finished).
    ;(async () => {
      try {
        // Fetch final player scores + game name
        const [{data: finalPlayers}, {data: gameRow}] = await Promise.all([
          db
            .from('live_players')
            .select('id, user_id, nickname, avatar_id, total_score, is_host')
            .eq('session_id', trimmedSessionId)
            .order('total_score', {ascending: false}),
          db.from('games').select('name').eq('id', session.game_id).maybeSingle(),
        ])

        const players = (finalPlayers || []).map((p, idx) => ({
          id: p.id,
          user_id: p.user_id || null,
          nickname: p.nickname,
          avatar_id: p.avatar_id,
          total_score: p.total_score || 0,
          rank: idx + 1,
          is_host: p.is_host || false,
        }))

        // Avoid duplicate snapshot if finish is called multiple times
        const {data: existing} = await db
          .from('live_session_results')
          .select('id')
          .eq('session_id', trimmedSessionId)
          .maybeSingle()

        if (!existing) {
          await db.from('live_session_results').insert({
            session_id: trimmedSessionId,
            host_user_id: session.host_user_id,
            game_id: session.game_id,
            game_name: gameRow?.name || 'Partita',
            played_at: finishedAt,
            player_count: players.length,
            players,
          })
        }
      } catch (err) {
        console.error('Non-fatal: failed to save session history snapshot', err)
      }
    })()

    // Opportunistic cleanup: delete sessions finished more than 24h ago.
    db.from('live_sessions')
      .delete()
      .eq('status', 'finished')
      .lt('finished_at', new Date(Date.now() - 86_400_000).toISOString())
      .then(() => {})

    return NextResponse.json({ok: true, sessionId: trimmedSessionId})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
