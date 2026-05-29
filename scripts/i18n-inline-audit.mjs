#!/usr/bin/env node
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {execSync} from 'node:child_process'

const ROOT = process.cwd()
const EXTS = ['.js', '.jsx', '.ts', '.tsx']

const includeGlobs = ['src/app', 'src/components']
const ignoreMatchers = [
  /loading\.js$/,
  /skeleton/i,
  /changelog\/page\.js$/,
  /locales\/(it|en)\.json$/,
]

function getFiles() {
  const out = execSync(`rg --files ${includeGlobs.join(' ')}`, {encoding: 'utf8'})
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => EXTS.some((ext) => file.endsWith(ext)))
    .filter((file) => !ignoreMatchers.some((rx) => rx.test(file)))
}

function scanFile(file) {
  const text = readFileSync(join(ROOT, file), 'utf8')
  const lines = text.split('\n')
  const results = []

  const inlineString = /(['"`])([^'"`\n]*[A-Za-zÀ-ÿ][^'"`\n]*)\1/g
  const trivial = /^(use client|use server|it|en|id|name|className|type|button|div|span|main|true|false|\.\.\.)$/i

  lines.forEach((line, idx) => {
    if (line.includes('import ') || line.includes('from ')) return
    if (line.includes('http://') || line.includes('https://')) return
    if (line.includes('aria-hidden')) return
    if (line.includes('console.')) return
    if (line.includes('t(') || line.includes('useT(') || line.includes('pickLangText(')) return

    let match
    while ((match = inlineString.exec(line)) !== null) {
      const value = match[2].trim()
      if (!value) continue
      if (trivial.test(value)) continue
      if (value.startsWith('/')) continue
      if (value.length < 3) continue
      results.push({line: idx + 1, text: value})
    }
  })

  return results
}

const files = getFiles()
const findings = []

for (const file of files) {
  const hits = scanFile(file)
  if (hits.length) findings.push({file, hits})
}

if (!findings.length) {
  console.log('No inline text candidates found.')
  process.exit(0)
}

console.log(`# Inline text audit (${findings.length} files)\n`)
for (const item of findings) {
  console.log(item.file)
  item.hits.slice(0, 10).forEach((hit) => {
    console.log(`  L${hit.line}: ${hit.text}`)
  })
  if (item.hits.length > 10) {
    console.log(`  ... +${item.hits.length - 10} more`)
  }
  console.log('')
}
