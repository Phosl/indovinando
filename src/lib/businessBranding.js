function normalizeWebsite(value) {
  const website = String(value || '').trim()
  if (!website) return ''
  if (/^https?:\/\//i.test(website)) return website
  return `https://${website}`
}

export function getBusinessBranding(profile = {}) {
  return {
    activityName: String(profile.business_name || profile.username || '').trim(),
    activityType: String(profile.business_type || '').trim(),
    logoUrl: String(profile.business_logo_url || '').trim(),
    logoPath: String(profile.business_logo_path || '').trim(),
    address: String(profile.business_address || '').trim(),
    phone: String(profile.business_phone || '').trim(),
    website: normalizeWebsite(profile.business_website),
    city: String(profile.city || '').trim(),
    province: String(profile.province || '').trim(),
  }
}

export function hasBusinessBranding(branding = {}) {
  return Boolean(branding.logoUrl || branding.activityName)
}

export function getBusinessContactLine(branding = {}) {
  return [branding.phone, branding.website].filter(Boolean).join(' · ')
}

export function getBusinessLocationLine(branding = {}) {
  return [branding.address, [branding.city, branding.province].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')
}
