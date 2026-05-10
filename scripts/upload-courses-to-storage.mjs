#!/usr/bin/env node
/**
 * Upload course JSON files to Supabase Storage bucket 'corsi'.
 * Run ONCE after creating the bucket with SUPABASE_COURSE_ADMIN_PATCH.sql.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/upload-courses-to-storage.mjs
 *
 * The env vars are already in .env.local — pass them explicitly or
 * run: node -r dotenv/config scripts/upload-courses-to-storage.mjs
 */

import {createClient} from '@supabase/supabase-js'
import {readFile} from 'fs/promises'
import {existsSync} from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COURSES_DIR = path.join(__dirname, '../public/corsi')
const BUCKET = 'corsi'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const files = [
  ...Array.from({length: 10}, (_, i) => `corso_livello_${i + 1}.json`),
  ...Array.from({length: 10}, (_, i) => `en/corso_livello_${i + 1}.json`),
]

let ok = 0
let fail = 0

for (const file of files) {
  const localPath = path.join(COURSES_DIR, file)
  if (!existsSync(localPath)) {
    console.warn(`⚠️  SKIP (not found locally): ${file}`)
    continue
  }

  const content = await readFile(localPath)

  const {error} = await supabase.storage
    .from(BUCKET)
    .upload(file, content, {
      contentType: 'application/json',
      upsert: true,
    })

  if (error) {
    console.error(`❌ FAILED: ${file} — ${error.message}`)
    fail++
  } else {
    console.log(`✅ OK: ${file}`)
    ok++
  }
}

console.log(`\nDone: ${ok} uploaded, ${fail} failed`)
