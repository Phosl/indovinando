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

export const BUSINESS_PROFILE_TYPES = ['wine_shop', 'restaurant', 'other_business']

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
    business_name: typeof profile.business_name === 'string' ? profile.business_name : '',
    business_type: typeof profile.business_type === 'string' ? profile.business_type : '',
    business_description:
      typeof profile.business_description === 'string' ? profile.business_description : '',
    business_website: typeof profile.business_website === 'string' ? profile.business_website : '',
    business_phone: typeof profile.business_phone === 'string' ? profile.business_phone : '',
    business_address: typeof profile.business_address === 'string' ? profile.business_address : '',
    business_latitude:
      typeof profile.business_latitude === 'number' ? profile.business_latitude : null,
    business_longitude:
      typeof profile.business_longitude === 'number' ? profile.business_longitude : null,
    profile_completed_at: profile.profile_completed_at ?? null,
    profile_prompt_dismissed_at: profile.profile_prompt_dismissed_at ?? null,
  }
}

export function isBusinessProfile(profile = {}) {
  return BUSINESS_PROFILE_TYPES.includes(profile.profile_type)
}

export function isProfileComplete(profile = {}) {
  if (profile.profile_completed_at) return true

  const baseComplete = Boolean(
    profile.profile_type &&
      profile.experience_level &&
      Array.isArray(profile.favorite_wine_types) &&
      profile.favorite_wine_types.length > 0 &&
      Array.isArray(profile.favorite_countries) &&
      profile.favorite_countries.length > 0 &&
      String(profile.city || '').trim() &&
      String(profile.province || '').trim(),
  )

  if (!baseComplete) return false
  if (!isBusinessProfile(profile)) return true

  return Boolean(
    String(profile.business_name || '').trim() &&
      String(profile.business_type || '').trim() &&
      String(profile.business_description || '').trim() &&
      String(profile.business_website || '').trim() &&
      String(profile.business_phone || '').trim() &&
      String(profile.business_address || '').trim() &&
      profile.business_latitude !== null &&
      profile.business_longitude !== null,
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
  if (isBusinessProfile(profile)) {
    if (String(profile.business_name || '').trim()) count += 1
    if (String(profile.business_type || '').trim()) count += 1
    if (String(profile.business_description || '').trim()) count += 1
    if (String(profile.business_website || '').trim()) count += 1
    if (String(profile.business_phone || '').trim()) count += 1
    if (String(profile.business_address || '').trim()) count += 1
    if (profile.business_latitude !== null && profile.business_longitude !== null) count += 1
  }
  return count
}
