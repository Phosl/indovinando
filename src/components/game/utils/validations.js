/**
 * Validation utilities for game editor
 */

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
    throw new Error(messages?.GAME_NAME_REQUIRED || 'Inserisci il nome del gioco.')
  }
}

export const validateQuestionnaire = (questions, messages) => {
  if (questions.length === 0) {
    throw new Error(messages?.QUESTIONS_REQUIRED || 'Aggiungi almeno una domanda al questionario.')
  }
}

export const validateBottles = (bottles, questions, messages) => {
  if (bottles.length === 0) {
    throw new Error(messages?.BOTTLES_REQUIRED || 'Devi aggiungere almeno una bottiglia.')
  }

  const hasTooLongYear = bottles.some((bottle) => (bottle?.year || '').trim().length > 4)
  if (hasTooLongYear) {
    throw new Error(
      messages?.BOTTLE_YEAR_TOO_LONG || "L'anno della bottiglia deve avere massimo 4 caratteri.",
    )
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
    throw new Error(
      messages?.INCOMPLETE_BOTTLES ||
        'Ci sono bottiglie con risposte mancanti. Aprile e completa tutte le risposte prima di salvare.',
    )
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
    throw new Error(
      messages?.BOTTLE_FORM_INCOMPLETE || 'Compila nome bottiglia, produttore e anno.',
    )
  }

  if ((year || '').trim().length > 4) {
    throw new Error(
      messages?.BOTTLE_YEAR_TOO_LONG || "L'anno della bottiglia deve avere massimo 4 caratteri.",
    )
  }

  if (
    currentAnswers.length !== questions.length ||
    currentAnswers.some((answer, index) => {
      if (isNeutralQuestion(questions[index])) return false
      return answer === null || answer === undefined
    })
  ) {
    throw new Error(
      messages?.BOTTLE_ANSWERS_INCOMPLETE || 'Seleziona la risposta corretta per ogni domanda.',
    )
  }
}

export const validateQuestionForm = (questionText, options, messages) => {
  if (!questionText.trim()) {
    throw new Error(messages?.QUESTION_TEXT_REQUIRED || 'Inserisci il testo della domanda.')
  }

  if (options.some((o) => !o.trim())) {
    throw new Error(messages?.OPTIONS_REQUIRED || 'Tutte le opzioni devono essere compilate.')
  }
}
