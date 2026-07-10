import {createClient} from '@supabase/supabase-js'

const eventSlug = String(process.argv[2] || process.env.TABLE_LIVE_TEST_EVENT_SLUG || '').trim()
const baseUrl = String(
  process.argv[3] || process.env.TABLE_LIVE_TEST_BASE_URL || 'http://localhost:3000',
).replace(/\/$/, '')

if (!eventSlug) {
  throw new Error('Pass an active event slug as the first argument')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase admin environment variables')
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {auth: {persistSession: false, autoRefreshToken: false}},
)
const createdSessionIds = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, init, expectedStatuses = [200]) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const payload = await response.json().catch(() => ({}))
  assert(
    expectedStatuses.includes(response.status),
    `${path} returned ${response.status}: ${payload?.error || 'unknown error'}`,
  )
  return {response, payload}
}

function playerStatePath(player) {
  const params = new URLSearchParams({
    sessionId: player.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
  })
  return `/api/table-live/session/state?${params.toString()}`
}

async function post(path, body, expectedStatuses = [200]) {
  return request(
    path,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    },
    expectedStatuses,
  )
}

async function answerRound(player, state, mode) {
  for (const [questionIndex, question] of state.questions.entries()) {
    const selectedOptionId = question.options?.[0]?.id
    assert(selectedOptionId, `Question ${question.id} has no options`)
    const {payload} = await post('/api/table-live/round-answer', {
      sessionId: player.sessionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      questionId: question.id,
      selectedOptionId,
    })
    if (mode === 'end') {
      assert(payload.isCorrect === null, 'End mode exposed answer correctness too early')
      assert(payload.points === 0, 'End mode exposed answer points too early')
      assert(payload.correctOptionId === null, 'End mode exposed a correct option too early')
    }
    if (questionIndex === 0) {
      const duplicate = await post('/api/table-live/round-answer', {
        sessionId: player.sessionId,
        playerId: player.playerId,
        playerToken: player.playerToken,
        questionId: question.id,
        selectedOptionId,
      })
      assert(duplicate.payload.alreadySubmitted === true, 'Same answer retry is not idempotent')

      const differentOptionId = question.options?.[1]?.id
      if (differentOptionId) {
        await post(
          '/api/table-live/round-answer',
          {
            sessionId: player.sessionId,
            playerId: player.playerId,
            playerToken: player.playerToken,
            questionId: question.id,
            selectedOptionId: differentOptionId,
          },
          [409],
        )
      }
    }
  }
}

async function runMode(mode) {
  const suffix = `${Date.now().toString().slice(-7)}-${mode}`
  const {payload: host} = await post('/api/table-live/session/create', {
    eventSlug,
    nickname: `QA Host ${suffix}`,
    answerRevealMode: mode,
  })
  createdSessionIds.push(host.sessionId)

  const {payload: guest} = await post('/api/table-live/session/join', {
    eventSlug,
    joinCode: host.joinCode,
    nickname: `QA Guest ${suffix}`,
  })

  const {payload: leavingGuest} = await post('/api/table-live/session/join', {
    eventSlug,
    joinCode: host.joinCode,
    nickname: `QA Leave ${suffix}`,
  })
  const leaveResult = await post('/api/table-live/session/leave', {
    sessionId: leavingGuest.sessionId,
    playerId: leavingGuest.playerId,
    playerToken: leavingGuest.playerToken,
  })
  assert(leaveResult.payload.sessionClosed === false, 'Guest leave closed the session')

  const anonymousState = await request(
    `/api/table-live/session/state?sessionId=${encodeURIComponent(host.sessionId)}`,
    undefined,
    [403],
  )
  assert(anonymousState.payload.joinUrl?.includes(host.joinCode), 'Missing safe join redirect')

  await post('/api/table-live/session/start', {
    sessionId: host.sessionId,
    playerId: host.playerId,
    playerToken: host.playerToken,
  })

  const {payload: lobbyAfterLeave} = await request(playerStatePath(host))
  assert(lobbyAfterLeave.players?.length === 2, 'Inactive guest still blocks the session')

  await post(
    '/api/table-live/session/join',
    {
      eventSlug,
      joinCode: host.joinCode,
      nickname: `QA Late ${suffix}`,
    },
    [409],
  )

  let finished = false
  let rounds = 0
  while (!finished) {
    rounds += 1
    assert(rounds < 20, 'Too many rounds without finishing')

    const {payload: hostState} = await request(playerStatePath(host))
    const {payload: guestState} = await request(playerStatePath(guest))
    assert(hostState.me?.isHost === true, 'Host identity was not restored')
    assert(guestState.me?.isHost === false, 'Guest was identified as host')
    assert(hostState.questions?.length > 0, 'Session has no questions')
    assert(hostState.bottles?.length > 0, 'Session has no bottles')

    if (mode === 'end') {
      assert(
        Object.keys(hostState.correctOptionByQuestion || {}).length === 0,
        'End mode exposed answers before round completion',
      )
    }

    await answerRound(host, hostState, mode)
    await answerRound(guest, guestState, mode)

    const {payload: completedHostState} = await request(playerStatePath(host))
    assert(
      completedHostState.myAnswers?.length === hostState.questions.length,
      'Host answers were not restored after refresh',
    )
    if (mode === 'end') {
      assert(
        Object.keys(completedHostState.correctOptionByQuestion || {}).length > 0,
        'End mode did not reveal answers after completion',
      )
    }

    await post(
      '/api/table-live/advance-auto',
      {
        sessionId: guest.sessionId,
        playerId: guest.playerId,
        playerToken: guest.playerToken,
      },
      [403],
    )

    const {payload: advance} = await post('/api/table-live/advance-auto', {
      sessionId: host.sessionId,
      playerId: host.playerId,
      playerToken: host.playerToken,
    })
    assert(advance.advanced === true, `Host did not advance: ${advance.reason || 'unknown'}`)
    finished = advance.finished === true
  }

  const retry = await post('/api/table-live/advance-auto', {
    sessionId: host.sessionId,
    playerId: host.playerId,
    playerToken: host.playerToken,
  })
  assert(retry.payload.reason === 'already_finished', 'Finished advance retry is not idempotent')

  const standings = await request(
    `/api/table-live/session/standings?sessionId=${encodeURIComponent(host.sessionId)}`,
  )
  assert(standings.payload.standings?.length === 2, 'Final standings are incomplete')
  assert(
    standings.payload.standings.every(
      (player) => player.roundPoints === 0 && player.liveTotalScore === player.total_score,
    ),
    'Final standings still project the completed round',
  )

  return {mode, rounds, players: standings.payload.standings.length}
}

async function runHostLeave() {
  const suffix = `${Date.now().toString().slice(-7)}-leave`
  const {payload: host} = await post('/api/table-live/session/create', {
    eventSlug,
    nickname: `QA Host ${suffix}`,
    answerRevealMode: 'instant',
  })
  createdSessionIds.push(host.sessionId)

  const leaveResult = await post('/api/table-live/session/leave', {
    sessionId: host.sessionId,
    playerId: host.playerId,
    playerToken: host.playerToken,
  })
  assert(leaveResult.payload.sessionClosed === true, 'Host leave did not close the session')

  await post(
    '/api/table-live/session/validate',
    {eventSlug, joinCode: host.joinCode},
    [409],
  )

  return {hostLeaveClosedSession: true}
}

try {
  const results = []
  results.push(await runHostLeave())
  results.push(await runMode('instant'))
  results.push(await runMode('end'))
  console.log(JSON.stringify({ok: true, baseUrl, eventSlug, results}, null, 2))
} finally {
  if (createdSessionIds.length > 0) {
    const {error} = await admin.from('table_live_sessions').delete().in('id', createdSessionIds)
    if (error) console.error(`Cleanup failed: ${error.message}`)
  }
}
