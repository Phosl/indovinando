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
    Array.isArray(bottle.answers) &&
    bottle.answers.length === questionsLength &&
    bottle.answers.every((a) => a !== null && a !== undefined)
  )
}

export const validateGameName = (name) => {
  if (!name.trim()) {
    throw new Error('Inserisci il nome del gioco.')
  }
}

export const validateQuestionnaire = (questions) => {
  if (questions.length === 0) {
    throw new Error('Aggiungi almeno una domanda al questionario.')
  }
}

export const validateBottles = (bottles, questions) => {
  if (bottles.length === 0) {
    throw new Error('Devi aggiungere almeno una bottiglia.')
  }

  const hasIncompleteBottle = bottles.some(
    (bottle) =>
      !Array.isArray(bottle.answers) ||
      bottle.answers.length !== questions.length ||
      bottle.answers.some((answer) => answer === null || answer === undefined),
  )

  if (hasIncompleteBottle) {
    throw new Error(
      'Ci sono bottiglie con risposte mancanti. Aprile e completa tutte le risposte prima di salvare.',
    )
  }
}

export const validateBottleForm = (bottleName, producer, year, currentAnswers, questionsLength) => {
  if (currentAnswers.length !== questionsLength || currentAnswers.some((a) => a === null)) {
    throw new Error('Seleziona la risposta corretta per ogni domanda.')
  }
}

export const validateQuestionForm = (questionText, options) => {
  if (!questionText.trim()) {
    throw new Error('Inserisci il testo della domanda.')
  }

  if (options.some((o) => !o.trim())) {
    throw new Error('Tutte le opzioni devono essere compilate.')
  }
}
