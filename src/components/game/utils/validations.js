/**
 * Validation utilities for game editor
 */

const DEFAULT_ALERTS = {
  GAME_NAME_REQUIRED: 'Enter a game name.',
  QUESTIONS_REQUIRED: 'Add at least one question to the questionnaire.',
  BOTTLES_REQUIRED: 'Save at least one bottle.',
  INCOMPLETE_BOTTLES:
    'Some bottles have missing answers. Open them and complete all answers before saving.',
  BOTTLE_FORM_INCOMPLETE: 'Fill in bottle name, producer, year, and wine type.',
  BOTTLE_YEAR_TOO_LONG: 'Bottle year must be at most 4 characters.',
  BOTTLE_ANSWERS_INCOMPLETE: 'Select the correct answer for each question.',
  QUESTION_TEXT_REQUIRED: 'Enter the question text.',
  OPTIONS_REQUIRED: 'All options must be filled in.',
}

function getAlertMessage(messages, key) {
  return messages?.[key] || DEFAULT_ALERTS[key] || 'Validation error.'
}

function normalizeQuestionLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export const isPlayerRatingQuestion = (question) => {
  const kind = String(question?.kind || '').trim().toLowerCase()
  if (kind === 'rating') return true
  const text = normalizeQuestionLabel(question?.text)
  return text === 'che voto daresti a questo vino?' || text === 'what rating would you give this wine?'
}

export const isNeutralQuestion = (question) => {
  if (!question) return false
  if (question.isNeutral === true) return true
  const kind = String(question?.kind || '').trim().toLowerCase()
  if (kind === 'neutral') return true
  return isPlayerRatingQuestion(question)
}

export const isQuestionComplete = (question) => {
  if (isNeutralQuestion(question)) {
    return question && question.text && question.text.trim().length > 0
  }
  return (
    question &&
    question.text &&
    question.text.trim().length > 0 &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every((opt) => opt && opt.trim().length > 0)
  )
}

export const isBottleComplete = (bottle, questionsOrLength) => {
  const questions = Array.isArray(questionsOrLength) ? questionsOrLength : null
  const questionsLength = questions ? questions.length : Number(questionsOrLength) || 0
  const answers = Array.isArray(bottle?.answers) ? bottle.answers : []

  return (
    bottle &&
    bottle.name &&
    bottle.producer &&
    bottle.year &&
    bottle.wineType &&
    answers.length === questionsLength &&
    answers.every((answer, index) => {
      if (questions && isNeutralQuestion(questions[index])) return true
      return answer !== null && answer !== undefined
    })
  )
}

export const validateGameName = (name, messages) => {
  if (!name.trim()) {
    throw new Error(getAlertMessage(messages, 'GAME_NAME_REQUIRED'))
  }
}

export const validateQuestionnaire = (questions, messages) => {
  if (questions.length === 0) {
    throw new Error(getAlertMessage(messages, 'QUESTIONS_REQUIRED'))
  }
}

export const validateBottles = (bottles, questions, messages) => {
  if (bottles.length === 0) {
    throw new Error(getAlertMessage(messages, 'BOTTLES_REQUIRED'))
  }

  const hasTooLongYear = bottles.some((bottle) => (bottle?.year || '').trim().length > 4)
  if (hasTooLongYear) {
    throw new Error(getAlertMessage(messages, 'BOTTLE_YEAR_TOO_LONG'))
  }

  const hasIncompleteBottle = bottles.some(
    (bottle) =>
      !Array.isArray(bottle.answers) ||
      bottle.answers.length !== questions.length ||
      bottle.answers.some((answer, index) => {
        if (isNeutralQuestion(questions[index])) return false
        return answer === null || answer === undefined
      }),
  )

  if (hasIncompleteBottle) {
    throw new Error(getAlertMessage(messages, 'INCOMPLETE_BOTTLES'))
  }
}

export const validateBottleForm = (
  bottleName,
  producer,
  year,
  wineType,
  currentAnswers,
  questions,
  messages,
) => {
  const isBottleMetaMissing =
    !bottleName?.trim() || !producer?.trim() || !year?.trim() || !wineType?.trim()

  if (isBottleMetaMissing) {
    throw new Error(getAlertMessage(messages, 'BOTTLE_FORM_INCOMPLETE'))
  }

  if ((year || '').trim().length > 4) {
    throw new Error(getAlertMessage(messages, 'BOTTLE_YEAR_TOO_LONG'))
  }

  if (
    currentAnswers.length !== questions.length ||
    currentAnswers.some((answer, index) => {
      if (isNeutralQuestion(questions[index])) return false
      return answer === null || answer === undefined
    })
  ) {
    throw new Error(getAlertMessage(messages, 'BOTTLE_ANSWERS_INCOMPLETE'))
  }
}

export const validateQuestionForm = (questionText, options, messages) => {
  if (!questionText.trim()) {
    throw new Error(getAlertMessage(messages, 'QUESTION_TEXT_REQUIRED'))
  }

  if (options.some((o) => !o.trim())) {
    throw new Error(getAlertMessage(messages, 'OPTIONS_REQUIRED'))
  }
}
