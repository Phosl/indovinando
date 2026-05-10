import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export async function POST(request) {
  try {
    const {name, id: requestedId} = await request.json()
    const trimmedName = String(name ?? '').trim()

    if (!trimmedName) {
      return NextResponse.json({error: 'Missing game name'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const gameId =
      typeof requestedId === 'string' && requestedId.trim()
        ? requestedId.trim()
        : crypto.randomUUID()

    const {error} = await supabase.from('games').insert({
      id: gameId,
      name: trimmedName,
      created_by: user.id,
      status: 'published',
    })

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({id: gameId})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
