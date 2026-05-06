/**
 * Constants for game editor
 */

export const STEPS = [
  {id: 1, label: 'Nome Gioco'},
  {id: 2, label: 'Questionario'},
  {id: 3, label: 'Scheda'},
  {id: 4, label: 'Bottiglie'},
]

export const MIN_STEP = 1
export const MAX_STEP = STEPS.length

export const ALERT_MESSAGES = {
  GAME_NAME_REQUIRED: 'Inserisci il nome del gioco.',
  QUESTIONS_REQUIRED: 'Aggiungi almeno una domanda al questionario.',
  BOTTLES_REQUIRED: 'Devi salvare almeno una bottiglia con il questionario.',
  INCOMPLETE_BOTTLES:
    'Ci sono bottiglie con risposte mancanti. Aprile e completa tutte le risposte prima di salvare.',
  BOTTLE_FORM_INCOMPLETE: 'Compila nome bottiglia, produttore e anno.',
  BOTTLE_ANSWERS_INCOMPLETE: 'Seleziona la risposta corretta per ogni domanda.',
  QUESTION_TEXT_REQUIRED: 'Inserisci il testo della domanda.',
  OPTIONS_REQUIRED: 'Tutte le opzioni devono essere compilate.',
  QUESTIONNAIRE_UPDATED:
    'Questionario aggiornato. Le risposte delle bottiglie sono state riallineate: controlla quelle mancanti.',
  USER_NOT_AUTHENTICATED: 'Utente non autenticato',
  GAME_SAVED_SUCCESS: 'Gioco salvato con successo!',
  GAME_SAVE_ERROR: 'Errore durante il salvataggio del gioco',
}

export const MIN_OPTIONS = 2
export const DEFAULT_GAME_NAME = 'WINEGAME'
