import {createClient} from '@supabase/supabase-js'
import {BUSINESS_PROFILE_TYPES, isBusinessProfile, isProfileComplete} from './profileSetup'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createPartnersClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

export function slugifyPartner(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getPartnerCategory(profile = {}, lang = 'it') {
  const explicitType = String(profile.business_type || '').trim()
  if (explicitType) return explicitType

  const labels = {
    it: {
      wine_shop: 'Enoteca',
      restaurant: 'Ristorante',
      other_business: 'Attività partner',
    },
    en: {
      wine_shop: 'Wine shop',
      restaurant: 'Restaurant',
      other_business: 'Partner business',
    },
  }

  return labels[lang]?.[profile.profile_type] || labels.it[profile.profile_type] || 'Partner'
}

export function buildPartnerSlug(profile = {}) {
  if (String(profile.partner_slug || '').trim()) return String(profile.partner_slug).trim()
  const base = slugifyPartner(profile.business_name || profile.username || 'partner') || 'partner'
  const suffix = String(profile.id || '').replace(/-/g, '').slice(0, 6).toLowerCase()
  return suffix ? `${base}-${suffix}` : base
}

export function mapProfileToPublicPartner(profile = {}, lang = 'it') {
  const city = String(profile.city || '').trim()
  const province = String(profile.province || '').trim()
  const location = [city, province].filter(Boolean).join(', ')

  return {
    id: profile.id,
    slug: buildPartnerSlug(profile),
    name: String(profile.business_name || profile.username || 'Partner').trim(),
    category: getPartnerCategory(profile, lang),
    description: String(profile.business_description || '').trim(),
    website: String(profile.business_website || '').trim(),
    phone: String(profile.business_phone || '').trim(),
    address: String(profile.business_address || '').trim(),
    city,
    province,
    location,
    latitude: typeof profile.business_latitude === 'number' ? profile.business_latitude : null,
    longitude: typeof profile.business_longitude === 'number' ? profile.business_longitude : null,
    isPublic: profile.is_partner_public === true,
  }
}

export async function listPublicPartners(fallbackClient, lang = 'it') {
  const supabase = createPartnersClient(fallbackClient)
  const {data, error} = await supabase
    .from('profiles')
    .select(
      'id, username, profile_type, business_name, business_type, business_description, business_website, business_phone, business_address, business_latitude, business_longitude, city, province, is_partner_public, partner_slug, profile_completed_at, experience_level, favorite_wine_types, favorite_countries',
    )
    .in('profile_type', BUSINESS_PROFILE_TYPES)
    .order('profile_completed_at', {ascending: false, nullsFirst: false})

  if (error || !Array.isArray(data)) return []

  return data
    .filter(
      (profile) =>
        isBusinessProfile(profile) &&
        isProfileComplete(profile) &&
        profile.is_partner_public === true,
    )
    .map((profile) => mapProfileToPublicPartner(profile, lang))
    .filter((partner) => partner.name)
}

export async function getPublicPartnerBySlug(fallbackClient, slug, lang = 'it') {
  const partners = await listPublicPartners(fallbackClient, lang)
  return partners.find((partner) => partner.slug === slug) || null
}
