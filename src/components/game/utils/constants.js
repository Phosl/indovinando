/**
 * Constants for game editor
 */

import {GAME_EDITOR_DICTIONARY, pickLangText} from '@/lib/i18n/dictionaries'

export const STEPS = GAME_EDITOR_DICTIONARY.steps.it

export const MIN_STEP = 1
export const MAX_STEP = STEPS.length

export const ALERT_MESSAGES = GAME_EDITOR_DICTIONARY.alerts.it

export const MIN_OPTIONS = 2
export const DEFAULT_GAME_NAME = 'WINEGAME'

export function getSteps(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.steps)
}

export function getAlertMessages(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.alerts)
}

export function getGameEditorText(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.ui)
}

export function getQuestionsListText(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.questionsList)
}

export function getBottlesListText(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.bottlesList)
}

export function getBottleModalText(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.bottleModal)
}

export function getQuestionModalText(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.questionModal)
}

export function getGamePlayViewText(lang) {
  return pickLangText(lang, GAME_EDITOR_DICTIONARY.gamePlayView)
}
