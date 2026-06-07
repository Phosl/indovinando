import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const payload = await request.json()
    const nextPayload = {
      ...payload,
      id: user.id,
      updated_at: new Date().toISOString(),
    }

    const {error} = await supabase.from('profiles').upsert(nextPayload, {
      onConflict: 'id',
    })

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({ok: true})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
