import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabaseOrFallback} from '@/lib/supabaseAdmin'
import {normalizeGameSavePayload} from '@/lib/gameSaveValidation'
import {buildCanonicalWineKey, parseNumericSnapshot} from '@/lib/wineIdentity'

function normalizeYear(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 4)
}

function normalizeOptionalText(value) {
  const text = String(value ?? '').trim()
  return text || null
}

export async function POST(request) {
  try {
    let rawPayload = null
    try {
      rawPayload = await request.json()
    } catch {
      return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400})
    }
    const {mode, gameId, name, questions, bottles, status, coverIndex} =
      normalizeGameSavePayload(rawPayload)

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const db = createAdminSupabaseOrFallback(supabase)
    const hasExistingGameId = Boolean(gameId)
    const currentGameId = hasExistingGameId ? gameId : crypto.randomUUID()

    if (mode === 'edit' || (mode !== 'create' && hasExistingGameId)) {
      const {data: updatedGame, error: updateError} = await db
        .from('games')
        .update({name, status, cover_index: coverIndex})
        .eq('id', currentGameId)
        .eq('created_by', user.id)
        .select('id')
        .maybeSingle()

      if (updateError) {
        return NextResponse.json({error: updateError.message}, {status: 500})
      }
      if (!updatedGame) {
        return NextResponse.json({error: 'Game not found'}, {status: 404})
      }

      const {error: deleteBottlesError} = await db
        .from('game_bottles')
        .delete()
        .eq('game_id', currentGameId)
      if (deleteBottlesError) {
        return NextResponse.json({error: deleteBottlesError.message}, {status: 500})
      }

      const {error: deleteQuestionsError} = await db
        .from('game_questions')
        .delete()
        .eq('game_id', currentGameId)
      if (deleteQuestionsError) {
        return NextResponse.json({error: deleteQuestionsError.message}, {status: 500})
      }
    } else {
      const {error: createError} = await db.from('games').insert({
        id: currentGameId,
        name,
        created_by: user.id,
        status,
        cover_index: coverIndex,
      })

      if (createError) {
        return NextResponse.json({error: createError.message}, {status: 500})
      }
    }

    const questionsToInsert = questions.map((question, index) => ({
      game_id: currentGameId,
      text: String(question.text ?? '').trim(),
      kind: String(question.kind ?? '').trim() || null,
      is_neutral: question.isNeutral === true,
      display_order: index,
    }))

    const {data: insertedQuestions, error: questionsError} = await db
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

    const {data: insertedOptions, error: optionsError} = await db
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
      const bottleRows = bottles.map((bottle, index) => {
        const normalizedName = String(bottle.name ?? '').trim()
        const normalizedProducer = String(bottle.producer ?? '').trim()
        const normalizedYear = normalizeYear(bottle.year)

        return {
          game_id: currentGameId,
          name: normalizedName,
          producer: normalizedProducer,
          year: normalizedYear,
          wine_type: String(bottle.wineType ?? '').trim() || null,
          canonical_wine_key:
            normalizeOptionalText(bottle.canonicalWineKey) ||
            buildCanonicalWineKey({
              name: normalizedName,
              producer: normalizedProducer,
              year: normalizedYear,
            }),
          wine_vintage_id: normalizeOptionalText(bottle.wineVintageId),
          price_value: parseNumericSnapshot(bottle.priceValue),
          price_min: parseNumericSnapshot(bottle.priceMin),
          price_max: parseNumericSnapshot(bottle.priceMax),
          price_currency: normalizeOptionalText(bottle.priceCurrency),
          price_band: normalizeOptionalText(bottle.priceBand),
          region_label: normalizeOptionalText(bottle.regionLabel),
          appellation_label: normalizeOptionalText(bottle.appellationLabel),
          bottle_order: index,
        }
      })

      const {data: insertedBottles, error: bottlesError} = await db
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
        const {error: answersError} = await db.from('game_bottle_answers').insert(answersToInsert)
        if (answersError) {
          return NextResponse.json({error: answersError.message}, {status: 500})
        }
      }
    }

    return NextResponse.json({id: currentGameId})
  } catch (error) {
    const responseStatus = Number.isInteger(error?.status) ? error.status : 500
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: responseStatus})
  }
}
