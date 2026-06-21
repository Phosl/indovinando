const MAX_GAME_NAME_LENGTH = 160
const MAX_QUESTIONS = 120
const MAX_OPTIONS_PER_QUESTION = 24
const MAX_BOTTLES = 300
const MAX_TEXT_LENGTH = 700

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function trimText(value) {
  return String(value ?? '').trim()
}

function isNeutralQuestion(question) {
  if (question?.isNeutral === true) return true
  const kind = trimText(question?.kind).toLowerCase()
  return kind === 'neutral' || kind === 'rating'
}

function validationError(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function normalizeQuestion(question, index) {
  const source = asObject(question)
  if (!source) throw validationError(`Invalid question at position ${index + 1}`)

  const text = trimText(source.text)
  if (!text) throw validationError(`Missing question text at position ${index + 1}`)
  if (text.length > MAX_TEXT_LENGTH) {
    throw validationError(`Question text is too long at position ${index + 1}`)
  }

  const kind = trimText(source.kind) || null
  const neutral = isNeutralQuestion(source)
  const rawOptions = Array.isArray(source.options) ? source.options : []
  const options = rawOptions.map(trimText).filter(Boolean)

  if (!neutral && options.length < 2) {
    throw validationError(`Question ${index + 1} needs at least two options`)
  }

  if (options.length > MAX_OPTIONS_PER_QUESTION) {
    throw validationError(`Question ${index + 1} has too many options`)
  }

  if (options.some((option) => option.length > MAX_TEXT_LENGTH)) {
    throw validationError(`Question ${index + 1} has an option that is too long`)
  }

  return {
    text,
    kind,
    isNeutral: neutral,
    options,
  }
}

function normalizeBottle(bottle, index, questions) {
  const source = asObject(bottle)
  if (!source) throw validationError(`Invalid bottle at position ${index + 1}`)

  const name = trimText(source.name)
  const producer = trimText(source.producer)
  const year = trimText(source.year)
  const wineType = trimText(source.wineType)

  if (!name) {
    throw validationError(`Bottle ${index + 1} is missing a name`)
  }

  if (name.length > MAX_TEXT_LENGTH || producer.length > MAX_TEXT_LENGTH || wineType.length > MAX_TEXT_LENGTH) {
    throw validationError(`Bottle ${index + 1} has details that are too long`)
  }

  if (year.length > 4) {
    throw validationError(`Bottle ${index + 1} year is too long`)
  }

  const answers = Array.isArray(source.answers) ? source.answers : []
  if (answers.length > questions.length) {
    throw validationError(`Bottle ${index + 1} has too many answers`)
  }

  answers.forEach((answer, questionIndex) => {
    if (answer === null || answer === undefined) return

    const question = questions[questionIndex]
    if (question.isNeutral) return

    if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) {
      throw validationError(`Bottle ${index + 1} has an invalid answer for question ${questionIndex + 1}`)
    }
  })

  return {
    ...source,
    name,
    producer,
    year,
    wineType,
    answers,
  }
}

export function normalizeGameSavePayload(payload) {
  const source = asObject(payload)
  if (!source) throw validationError('Invalid request payload')

  const name = trimText(source.name)
  if (!name) throw validationError('Missing game name')
  if (name.length > MAX_GAME_NAME_LENGTH) throw validationError('Game name is too long')

  if (!Array.isArray(source.questions) || source.questions.length === 0) {
    throw validationError('Missing questions')
  }
  if (source.questions.length > MAX_QUESTIONS) throw validationError('Too many questions')

  const questions = source.questions.map(normalizeQuestion)
  const hasPlayableQuestion = questions.some((question) => !question.isNeutral)
  if (!hasPlayableQuestion) {
    throw validationError('Add at least one quiz question with answer options')
  }

  const rawBottles = Array.isArray(source.bottles) ? source.bottles : []
  if (rawBottles.length > MAX_BOTTLES) throw validationError('Too many bottles')
  const bottles = rawBottles.map((bottle, index) => normalizeBottle(bottle, index, questions))

  return {
    mode: trimText(source.mode),
    gameId: trimText(source.gameId),
    name,
    questions,
    bottles,
    status: source.status === 'published' ? 'published' : 'draft',
    coverIndex: Number.isInteger(source.coverIndex) && source.coverIndex >= 0 ? source.coverIndex : null,
  }
}
