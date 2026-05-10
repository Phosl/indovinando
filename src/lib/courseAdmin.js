import 'server-only'
import {createServerSupabase} from '@/lib/supabaseServer'

/**
 * Returns the super_admin flag for the current user.
 * Returns false if not authenticated.
 */
export async function isSuperAdmin() {
  const supabase = await createServerSupabase()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return false

  const {data} = await supabase
    .from('profiles')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  return data?.super_admin === true
}

/**
 * Save a course JSON to Supabase Storage.
 * Only super_admins can call this (checked server-side).
 */
export async function saveCourseJson(lang, levelNum, jsonData) {
  const supabase = await createServerSupabase()

  const {data: {user}} = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const {data: profile} = await supabase
    .from('profiles')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.super_admin) throw new Error('Not authorized')

  const filePath =
    lang === 'it'
      ? `corso_livello_${levelNum}.json`
      : `${lang}/corso_livello_${levelNum}.json`

  const content = JSON.stringify(jsonData, null, 2)

  const {error} = await supabase.storage
    .from('corsi')
    .upload(filePath, new Blob([content], {type: 'application/json'}), {
      upsert: true,
      contentType: 'application/json',
    })

  if (error) throw new Error(error.message)
  return {ok: true, path: filePath}
}

/**
 * Fetch raw course JSON from Storage (or filesystem fallback).
 * Used by the admin editor to get the editable structure.
 */
export async function getRawCourseJson(lang, levelNum) {
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const filePath =
    lang === 'it'
      ? `corso_livello_${levelNum}.json`
      : `${lang}/corso_livello_${levelNum}.json`

  // Try Storage first
  if (storageUrl) {
    try {
      const url = `${storageUrl}/storage/v1/object/public/corsi/${filePath}`
      const res = await fetch(url, {cache: 'no-store'})
      if (res.ok) return res.json()
    } catch {}
  }

  // Fallback to filesystem
  const {promises: fs} = await import('fs')
  const path = await import('path')
  const localPath = path.join(process.cwd(), 'public', 'corsi', filePath)
  const content = await fs.readFile(localPath, 'utf8')
  return JSON.parse(content)
}
