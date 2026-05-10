import 'server-only'

import {promises as fs} from 'fs'
import path from 'path'
import {cache} from 'react'

const readPackageVersion = cache(async () => {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(packageJsonRaw)

    if (typeof packageJson.version === 'string' && packageJson.version.trim()) {
      return packageJson.version.trim()
    }
  } catch {}

  return '0.1.0'
})

const readChangelogVersion = cache(async () => {
  try {
    const changelogPath = path.join(process.cwd(), 'src/app/changelog/page.js')
    const changelogRaw = await fs.readFile(changelogPath, 'utf8')
    const match = changelogRaw.match(/version:\s*'([^']+)'/)
    if (match?.[1]) return match[1].trim()
  } catch {}

  return null
})

export async function getAppVersion() {
  const envVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim()
  if (envVersion) return envVersion
  const changelogVersion = await readChangelogVersion()
  if (changelogVersion) return changelogVersion
  return readPackageVersion()
}
