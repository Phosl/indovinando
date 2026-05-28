import {readdir} from 'node:fs/promises'
import path from 'node:path'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg'])

export async function getGameAvatarOptions() {
  const avatarDir = path.join(process.cwd(), 'public', 'avatar_testing')

  try {
    const files = await readdir(avatarDir, {withFileTypes: true})
    return files
      .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => `/avatar_testing/${entry.name}`)
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}
