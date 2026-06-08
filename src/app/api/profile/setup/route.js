import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {buildPartnerSlug} from '@/lib/partners'

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
    const {
      data: currentProfile,
    } = await supabase
      .from('profiles')
      .select('id, username, business_name, partner_slug, is_partner_public')
      .eq('id', user.id)
      .single()

    const nextPayload = {
      ...payload,
      id: user.id,
      updated_at: new Date().toISOString(),
    }

    const wantsPublicPartner =
      payload?.is_partner_public === true ||
      (payload?.is_partner_public === undefined && currentProfile?.is_partner_public === true)

    if (wantsPublicPartner) {
      nextPayload.partner_slug =
        String(payload?.partner_slug || '').trim() ||
        String(currentProfile?.partner_slug || '').trim() ||
        buildPartnerSlug({
          ...currentProfile,
          ...payload,
          id: user.id,
        })
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
