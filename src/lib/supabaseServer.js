import {createServerClient} from '@supabase/ssr'
import {cookies} from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({name, value, ...options})
          } catch (error) {
            // Cookie modification called from Server Component
            // This is safe to ignore if middleware handles token refresh
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({name, value: '', ...options})
          } catch (error) {
            // Cookie removal called from Server Component
            // This is safe to ignore if middleware handles token refresh
          }
        },
      },
    },
  )
}
