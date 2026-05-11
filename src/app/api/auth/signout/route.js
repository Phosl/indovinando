import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    await supabase.auth.signOut()
  } catch {
    // best-effort — the client will clear cookies anyway
  }
  return NextResponse.json({ok: true})
}
