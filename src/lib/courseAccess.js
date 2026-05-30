import {normalizeLanguage} from './i18n/config'

export const COURSE_ACCESS = {
  FREE: 'free',
  REGISTERED: 'registered',
  PREMIUM: 'premium',
}

export function getLevelAccessRequirement(level) {
  if (level?.access === COURSE_ACCESS.PREMIUM) return COURSE_ACCESS.PREMIUM
  if (level?.access === COURSE_ACCESS.REGISTERED) return COURSE_ACCESS.REGISTERED
  if (level?.access === COURSE_ACCESS.FREE) return COURSE_ACCESS.FREE

  // Default policy: first 2 chapters free, then login required.
  if (Number(level?.order) <= 2) return COURSE_ACCESS.FREE
  return COURSE_ACCESS.REGISTERED
}

export function canAccessLevel(level, {userId = null, isPremium = false} = {}) {
  const requirement = getLevelAccessRequirement(level)

  if (requirement === COURSE_ACCESS.FREE) return true
  if (requirement === COURSE_ACCESS.REGISTERED) return Boolean(userId)
  if (requirement === COURSE_ACCESS.PREMIUM) return Boolean(userId) && Boolean(isPremium)
  return false
}

export function getCourseViewerState({userId = null, isPremium = false} = {}) {
  return {
    userId: userId || null,
    isRegistered: Boolean(userId),
    isPremium: Boolean(isPremium),
  }
}

export function getLockedReason(level, viewer) {
  const requirement = getLevelAccessRequirement(level)
  if (requirement === COURSE_ACCESS.FREE) return null
  if (requirement === COURSE_ACCESS.REGISTERED && !viewer?.isRegistered) return 'registered'
  if (requirement === COURSE_ACCESS.PREMIUM && !viewer?.isPremium) return 'premium'
  return null
}

export function getAuthRedirectPath(pathname = '/corso-vino', lang = 'it') {
  const nLang = normalizeLanguage(lang)
  const mode = nLang === 'en' ? 'register' : 'register'
  return `/auth?mode=${mode}&next=${encodeURIComponent(pathname)}`
}
