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

export async function getAppVersion() {
  const envVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim()
  if (envVersion) return envVersion
  return readPackageVersion()
}
