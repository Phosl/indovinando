/**
 * Constants for game editor
 */

import {getLocaleText} from '@/lib/i18n/getLocaleText'

export const STEPS = getLocaleText('it', 'gameEditor.steps', [])

export const MIN_STEP = 1
export const MAX_STEP = STEPS.length

export const ALERT_MESSAGES = getLocaleText('it', 'gameEditor.alerts', {})

export const MIN_OPTIONS = 2
export const DEFAULT_GAME_NAME = 'WINEGAME'

export function getSteps(lang) {
  return getLocaleText(lang, 'gameEditor.steps', STEPS)
}

export function getAlertMessages(lang) {
  return getLocaleText(lang, 'gameEditor.alerts', ALERT_MESSAGES)
}

export function getGameEditorText(lang) {
  return getLocaleText(lang, 'gameEditor.ui', {})
}

export function getQuestionsListText(lang) {
  return getLocaleText(lang, 'gameEditor.questionsList', {})
}

export function getBottlesListText(lang) {
  return getLocaleText(lang, 'gameEditor.bottlesList', {})
}

export function getBottleModalText(lang) {
  return getLocaleText(lang, 'gameEditor.bottleModal', {})
}

export function getQuestionModalText(lang) {
  return getLocaleText(lang, 'gameEditor.questionModal', {})
}

export function getGamePlayViewText(lang) {
  return getLocaleText(lang, 'gameEditor.gamePlayView', {})
}
