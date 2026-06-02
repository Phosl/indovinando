#!/usr/bin/env node
/**
 * Import CSV chunks from Supabase Storage into public.wine_import_staging.
 *
 * Why: avoid long browser SQL Editor sessions that can fail with
 * "Failed to fetch (api.supabase.com)" on big imports.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/import-wine-chunks-from-storage.mjs \
 *     --bucket=wine-import \
 *     --prefix=chunks/ \
 *     --row-batch=300
 */

import {createClient} from '@supabase/supabase-js'
import {randomUUID} from 'crypto'
import {existsSync, readFileSync} from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFromFiles() {
  const candidates = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env'),
  ]

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqPos = trimmed.indexOf('=')
      if (eqPos <= 0) continue

      const key = trimmed.slice(0, eqPos).trim()
      let value = trimmed.slice(eqPos + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  }
}

loadEnvFromFiles()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const options = parseArgs(process.argv.slice(2))
const bucket = options.bucket || 'wine-import'
const prefix = normalizePrefix(options.prefix)
const rowBatchSize = toPositiveInt(options['row-batch'], 300)
const runBatchId = options['batch-id'] || randomUUID()
const table = options.table || 'wine_import_staging'
const startAfter = options['start-after'] ? String(options['start-after']).trim() : ''
const maxFiles = toPositiveInt(options['max-files'], 0)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseArgs(argv) {
  const out = {}
  for (const token of argv) {
    if (!token.startsWith('--')) continue
    const [k, ...rest] = token.slice(2).split('=')
    out[k] = rest.length ? rest.join('=') : 'true'
  }
  return out
}

function toPositiveInt(value, fallback) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

function normalizePrefix(value) {
  if (value == null || value === '') return 'chunks/'
  const raw = String(value).trim()
  if (raw === 'root' || raw === '/' || raw === '.') return ''
  const noLeadingSlash = raw.replace(/^\/+/, '')
  return noLeadingSlash.endsWith('/') ? noLeadingSlash : `${noLeadingSlash}/`
}

async function withRetry(fn, label, attempts = 6) {
  let lastError
  for (let i = 1; i <= attempts; i++) {
    try {
      const result = await fn()
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw new Error(result.error.message || `${label} returned an error response`)
      }
      return result
    } catch (err) {
      lastError = err
      if (i < attempts) {
        const backoffMs = Math.min(5000, 500 * (2 ** (i - 1)))
        console.warn(`Retry ${i}/${attempts - 1} for ${label} in ${backoffMs}ms: ${err.message || err}`)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError?.message || lastError}`)
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i++
      row.push(field)
      field = ''
      if (!(row.length === 1 && row[0] === '')) rows.push(row)
      row = []
      continue
    }

    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (!(row.length === 1 && row[0] === '')) rows.push(row)
  }

  if (!rows.length) return []

  const headers = rows[0].map((h) => h.trim())
  const objects = []

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const obj = {}
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j]
      if (!key) continue
      const raw = values[j] ?? ''
      const trimmed = raw.trim()
      obj[key] = trimmed === '' ? null : trimmed
    }
    objects.push(obj)
  }

  return objects
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function listCsvFiles() {
  const files = []
  let offset = 0
  const pageSize = 100

  while (true) {
    const {data, error} = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: {column: 'name', order: 'asc'},
    })
    if (error) throw error
    if (!data || data.length === 0) break

    for (const entry of data) {
      if (!entry?.name) continue
      if (!entry.name.toLowerCase().endsWith('.csv')) continue
      files.push(`${prefix}${entry.name}`)
    }

    if (data.length < pageSize) break
    offset += data.length
  }

  return files.sort()
}

async function importFile(storagePath) {
  const {data, error} = await withRetry(
    () => supabase.storage.from(bucket).download(storagePath),
    `download ${storagePath}`,
  )
  if (error) throw error

  const csvText = await data.text()
  const rows = parseCsv(csvText)
  if (!rows.length) {
    console.log(`SKIP ${storagePath}: empty csv`) 
    return 0
  }

  const payload = rows.map((r) => ({
    ...r,
    batch_id: r.batch_id || runBatchId,
    processed: false,
  }))

  let inserted = 0
  const rowChunks = chunk(payload, rowBatchSize)

  for (const c of rowChunks) {
    const {error: insertError} = await withRetry(
      () => supabase.from(table).insert(c),
      `insert ${storagePath}`,
    )
    if (insertError) throw insertError
    inserted += c.length
  }

  return inserted
}

async function main() {
  console.log(`Import run batch_id: ${runBatchId}`)
  console.log(`Storage source: ${bucket}/${prefix}`)
  console.log(`Target table: public.${table}`)
  console.log(`Insert chunk size: ${rowBatchSize}`)

  let files = await listCsvFiles()

  if (startAfter) {
    files = files.filter((f) => f > startAfter)
  }

  if (maxFiles > 0) {
    files = files.slice(0, maxFiles)
  }

  if (!files.length) {
    console.log('No CSV files found in storage prefix')
    return
  }

  let totalRows = 0
  for (const file of files) {
    const inserted = await importFile(file)
    totalRows += inserted
    console.log(`OK ${file}: ${inserted} rows`) 
  }

  console.log(`Done. Inserted ${totalRows} rows into ${table}.`) 
  console.log('Next: run Agent/WINE_CATALOG_IMPORT.sql repeatedly until unprocessed_rows = 0.')
}

main().catch((err) => {
  console.error(`Import failed: ${err.message || err}`)
  process.exit(1)
})
