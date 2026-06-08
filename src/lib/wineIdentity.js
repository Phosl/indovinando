function slugToken(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildCanonicalWineKey({name, producer, year}) {
  const nameToken = slugToken(name)
  const producerToken = slugToken(producer)
  const yearToken = String(year ?? '')
    .trim()
    .replace(/[^0-9]/g, '')
    .slice(0, 4)

  return [nameToken, producerToken, yearToken].filter(Boolean).join('__') || null
}

export function parseNumericSnapshot(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
