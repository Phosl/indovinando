import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service credentials')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {persistSession: false, autoRefreshToken: false},
  })
}

function normalizeYear(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 4)
}

export async function POST(request) {
  try {
    const payload = await request.json()
    const {mode, gameId, name, questions = [], bottles = []} = payload || {}

    const trimmedName = String(name ?? '').trim()
    if (!trimmedName) {
      return NextResponse.json({error: 'Missing game name'}, {status: 400})
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({error: 'Missing questions'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const admin = createAdminClient()
    let currentGameId =
      typeof gameId === 'string' && gameId.trim() ? gameId.trim() : crypto.randomUUID()

    if (mode === 'edit' || (mode !== 'create' && gameId)) {
      const {error: updateError} = await admin
        .from('games')
        .update({name: trimmedName})
        .eq('id', currentGameId)
        .eq('created_by', user.id)

      if (updateError) {
        return NextResponse.json({error: updateError.message}, {status: 500})
      }

      const {error: deleteBottlesError} = await admin
        .from('game_bottles')
        .delete()
        .eq('game_id', currentGameId)
      if (deleteBottlesError) {
        return NextResponse.json({error: deleteBottlesError.message}, {status: 500})
      }

      const {error: deleteQuestionsError} = await admin
        .from('game_questions')
        .delete()
        .eq('game_id', currentGameId)
      if (deleteQuestionsError) {
        return NextResponse.json({error: deleteQuestionsError.message}, {status: 500})
      }
    } else {
      const {error: createError} = await admin.from('games').insert({
        id: currentGameId,
        name: trimmedName,
        created_by: user.id,
        status: 'published',
      })

      if (createError) {
        return NextResponse.json({error: createError.message}, {status: 500})
      }
    }

    const questionsToInsert = questions.map((question, index) => ({
      game_id: currentGameId,
      text: String(question.text ?? '').trim(),
      display_order: index,
    }))

    const {data: insertedQuestions, error: questionsError} = await admin
      .from('game_questions')
      .insert(questionsToInsert)
      .select('id, display_order')

    if (questionsError || !insertedQuestions?.length) {
      return NextResponse.json(
        {error: questionsError?.message || 'Failed to save questions'},
        {status: 500},
      )
    }

    const questionIdByOrder = new Map(insertedQuestions.map((row) => [row.display_order, row.id]))

    const optionsToInsert = questions.flatMap((question, qIndex) => {
      const questionId = questionIdByOrder.get(qIndex)
      return (question.options || []).map((optionText, oIndex) => ({
        question_id: questionId,
        text: String(optionText ?? '').trim(),
        option_order: oIndex,
      }))
    })

    const {data: insertedOptions, error: optionsError} = await admin
      .from('game_question_options')
      .insert(optionsToInsert)
      .select('id, question_id, option_order')

    if (optionsError || !insertedOptions?.length) {
      return NextResponse.json(
        {error: optionsError?.message || 'Failed to save options'},
        {status: 500},
      )
    }

    if (Array.isArray(bottles) && bottles.length > 0) {
      const bottleRows = bottles.map((bottle, index) => ({
        game_id: currentGameId,
        name: String(bottle.name ?? '').trim(),
        producer: String(bottle.producer ?? '').trim(),
        year: normalizeYear(bottle.year),
        bottle_order: index,
      }))

      const {data: insertedBottles, error: bottlesError} = await admin
        .from('game_bottles')
        .insert(bottleRows)
        .select('id, bottle_order')

      if (bottlesError || !insertedBottles?.length) {
        return NextResponse.json(
          {error: bottlesError?.message || 'Failed to save bottles'},
          {status: 500},
        )
      }

      const bottleIdByOrder = new Map(insertedBottles.map((row) => [row.bottle_order, row.id]))
      const optionIdByQuestionAndOrder = new Map(
        insertedOptions.map((row) => [`${row.question_id}-${row.option_order}`, row.id]),
      )

      const answersToInsert = bottles
        .flatMap((bottle, bottleIndex) => {
          const bottleId = bottleIdByOrder.get(bottleIndex)
          return (bottle.answers || []).map((selectedOptionOrder, questionOrder) => {
            const questionId = questionIdByOrder.get(questionOrder)
            const optionId = optionIdByQuestionAndOrder.get(`${questionId}-${selectedOptionOrder}`)
            return {
              bottle_id: bottleId,
              question_id: questionId,
              option_id: optionId,
            }
          })
        })
        .filter((row) => row.bottle_id && row.question_id && row.option_id)

      if (answersToInsert.length > 0) {
        const {error: answersError} = await admin
          .from('game_bottle_answers')
          .insert(answersToInsert)
        if (answersError) {
          return NextResponse.json({error: answersError.message}, {status: 500})
        }
      }
    }

    return NextResponse.json({id: currentGameId})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
