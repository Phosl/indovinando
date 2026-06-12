function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const WINE_TYPE_MAP = new Map([
  ['rosso', 'rosso'],
  ['red', 'rosso'],
  ['rouge', 'rosso'],
  ['tinto', 'rosso'],
  ['bianco', 'bianco'],
  ['white', 'bianco'],
  ['blanc', 'bianco'],
  ['blanco', 'bianco'],
  ['rose', 'rose'],
  ['rosato', 'rose'],
  ['roseo', 'rose'],
  ['rosé', 'rose'],
  ['champagne', 'champagne'],
  ['sparkling', 'champagne'],
  ['spumante', 'champagne'],
  ['prosecco', 'champagne'],
  ['cava', 'champagne'],
  ['franciacorta', 'champagne'],
  ['altro', 'altro'],
  ['other', 'altro'],
])

export function normalizeGameWineType(value) {
  const normalized = normalizeToken(value)
  if (!normalized) return ''
  return WINE_TYPE_MAP.get(normalized) || String(value || '').trim()
}

