import {createBrowserClient} from '@supabase/ssr'
import {createClient as createSupabaseClient} from '@supabase/supabase-js'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export const supabaseClient = createClient()

/**
 * Anon-only client for use in public/anonymous flows (e.g. Enoteca).
 * Uses plain @supabase/supabase-js (no SSR cookie auth) so it does NOT
 * queue queries behind session-cookie initialisation, which can hang in
 * the browser when the user is simultaneously logged-in via @supabase/ssr.
 */
export const supabaseAnonClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-anon-enoteca',
    },
  },
)
