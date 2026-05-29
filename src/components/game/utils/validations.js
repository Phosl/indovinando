/**
 * Validation utilities for game editor
 */

export const isQuestionComplete = (question) => {
  return (
    question &&
    question.text &&
    question.text.trim().length > 0 &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every((opt) => opt && opt.trim().length > 0)
  )
}

export const isBottleComplete = (bottle, questionsLength) => {
  return (
    bottle &&
    bottle.name &&
    bottle.producer &&
    bottle.year &&
    bottle.wineType &&
    Array.isArray(bottle.answers) &&
    bottle.answers.length === questionsLength &&
    bottle.answers.every((a) => a !== null && a !== undefined)
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
      bottle.answers.some((answer) => answer === null || answer === undefined),
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
  questionsLength,
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

  if (currentAnswers.length !== questionsLength || currentAnswers.some((a) => a === null)) {
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
