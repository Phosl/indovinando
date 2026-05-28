import {normalizeLanguage} from '@/lib/i18n/config'

function capitalizeWords(value) {
  return String(value || '').replace(/\b([a-zàèéìòù])([a-zàèéìòù]*)\b/giu, (_, first, rest) => {
    return `${first.toUpperCase()}${rest}`
  })
}

export function formatAppDate(input, lang = 'it') {
  if (!input) return ''
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const normalizedLang = normalizeLanguage(lang)
  const locale = normalizedLang === 'en' ? 'en-US' : 'it-IT'
  const raw = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)

  return capitalizeWords(raw)
}

export function formatAppDateTime(input, lang = 'it') {
  if (!input) return ''
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const normalizedLang = normalizeLanguage(lang)
  const locale = normalizedLang === 'en' ? 'en-GB' : 'it-IT'
  const dateLabel = formatAppDate(date, normalizedLang)
  const timeLabel = new Intl.DateTimeFormat(locale, {hour: '2-digit', minute: '2-digit'}).format(date)

  return `${dateLabel} · ${timeLabel}`
}
