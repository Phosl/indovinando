import {promises as fs} from 'fs'
import path from 'path'
import {translate} from '@vitalets/google-translate-api'

const ROOT = process.cwd()
const SOURCE_DIR = path.join(ROOT, 'public', 'corsi')
const TARGET_DIR = path.join(SOURCE_DIR, 'en')

const SKIP_KEYS = new Set(['id', 'slug', 'type', 'emoji'])

function shouldTranslateString(value) {
  if (!value) return false
  if (typeof value !== 'string') return false
  if (!/[A-Za-z\u00C0-\u017F]/.test(value)) return false
  return true
}

function collectStrings(node, keyPath = [], out = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => collectStrings(item, keyPath.concat(String(index)), out))
    return out
  }

  if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      if (SKIP_KEYS.has(key)) return
      collectStrings(value, keyPath.concat(key), out)
    })
    return out
  }

  if (shouldTranslateString(node)) {
    out.push({path: keyPath, value: node})
  }

  return out
}

function setAtPath(obj, keyPath, value) {
  let ref = obj
  for (let i = 0; i < keyPath.length - 1; i += 1) {
    ref = ref[keyPath[i]]
  }
  ref[keyPath[keyPath.length - 1]] = value
}

async function translateBatch(values) {
  const translated = await Promise.all(
    values.map(async (text) => {
      const result = await translate(text, {from: 'it', to: 'en'})
      return result.text
    }),
  )
  return translated
}

async function translateFile(fileName) {
  const sourcePath = path.join(SOURCE_DIR, fileName)
  const targetPath = path.join(TARGET_DIR, fileName)

  const raw = await fs.readFile(sourcePath, 'utf8')
  const data = JSON.parse(raw)
  const cloned = JSON.parse(JSON.stringify(data))
  const strings = collectStrings(cloned)

  const BATCH_SIZE = 40
  for (let i = 0; i < strings.length; i += BATCH_SIZE) {
    const batch = strings.slice(i, i + BATCH_SIZE)
    const translated = await translateBatch(batch.map((entry) => entry.value))
    translated.forEach((text, index) => {
      setAtPath(cloned, batch[index].path, text)
    })
    process.stdout.write(
      `Translated ${Math.min(i + BATCH_SIZE, strings.length)}/${strings.length} in ${fileName}\n`,
    )
  }

  await fs.mkdir(TARGET_DIR, {recursive: true})
  await fs.writeFile(targetPath, `${JSON.stringify(cloned, null, 2)}\n`, 'utf8')
  process.stdout.write(`Saved ${targetPath}\n`)
}

async function main() {
  const files = (await fs.readdir(SOURCE_DIR))
    .filter((name) => /^corso_livello_\d+\.json$/i.test(name))
    .sort()

  for (const file of files) {
    await translateFile(file)
  }

  process.stdout.write('All course files translated to EN.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
