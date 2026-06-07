export const PROFILE_TYPES = [
  'enthusiast',
  'wine_shop',
  'restaurant',
  'educator',
  'other_business',
]

export const EXPERIENCE_LEVELS = [
  'beginner',
  'amateur',
  'enthusiast',
  'expert',
  'sommelier',
  'professional',
]

export const WINE_TYPES = [
  'reds',
  'whites',
  'roses',
  'sparkling',
  'champagne',
  'sweet',
  'orange',
  'natural',
]

export const COUNTRY_OPTIONS = [
  'italy',
  'france',
  'spain',
  'usa',
  'argentina',
  'portugal',
  'germany',
  'other',
]

export function normalizeProfileSetup(profile = {}) {
  return {
    profile_type: typeof profile.profile_type === 'string' ? profile.profile_type : '',
    experience_level:
      typeof profile.experience_level === 'string' ? profile.experience_level : '',
    favorite_wine_types: Array.isArray(profile.favorite_wine_types)
      ? profile.favorite_wine_types
      : [],
    favorite_countries: Array.isArray(profile.favorite_countries) ? profile.favorite_countries : [],
    city: typeof profile.city === 'string' ? profile.city : '',
    province: typeof profile.province === 'string' ? profile.province : '',
    newsletter_opt_in: profile.newsletter_opt_in === true,
    profile_completed_at: profile.profile_completed_at ?? null,
    profile_prompt_dismissed_at: profile.profile_prompt_dismissed_at ?? null,
  }
}

export function isProfileComplete(profile = {}) {
  if (profile.profile_completed_at) return true

  return Boolean(
    profile.profile_type &&
      profile.experience_level &&
      Array.isArray(profile.favorite_wine_types) &&
      profile.favorite_wine_types.length > 0 &&
      Array.isArray(profile.favorite_countries) &&
      profile.favorite_countries.length > 0 &&
      String(profile.city || '').trim() &&
      String(profile.province || '').trim(),
  )
}

export function getProfileCompletionCount(profile = {}) {
  let count = 0
  if (profile.profile_type) count += 1
  if (profile.experience_level) count += 1
  if (Array.isArray(profile.favorite_wine_types) && profile.favorite_wine_types.length > 0) count += 1
  if (Array.isArray(profile.favorite_countries) && profile.favorite_countries.length > 0) count += 1
  if (String(profile.city || '').trim()) count += 1
  if (String(profile.province || '').trim()) count += 1
  return count
}
