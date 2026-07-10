import {NextResponse} from 'next/server'
import {isSuperAdmin} from '@/lib/courseAdmin'
import {getControlCenterSnapshot} from '@/lib/adminControlCenter'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const allowed = await isSuperAdmin()
  if (!allowed) {
    return NextResponse.json({error: 'Not authorized'}, {status: 403})
  }

  try {
    const url = new URL(request.url)
    const scope = url.searchParams.get('scope') === 'deep' ? 'deep' : 'quick'
    const snapshot = await getControlCenterSnapshot({scope})
    return NextResponse.json(snapshot, {
      headers: {'Cache-Control': 'no-store'},
    })
  } catch (error) {
    return NextResponse.json(
      {error: error?.message || 'Unable to run control center checks'},
      {status: 500},
    )
  }
}
