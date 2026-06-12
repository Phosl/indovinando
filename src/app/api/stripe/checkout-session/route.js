import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabase} from '@/lib/supabaseAdmin'
import {getCreditPackByCode, getStripeClient, listAvailableCreditPacks} from '@/lib/stripe'

function buildCheckoutReturnUrl(request, path) {
  const rawEnvBaseUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const envBaseUrl = rawEnvBaseUrl
    ? rawEnvBaseUrl.startsWith('http://') || rawEnvBaseUrl.startsWith('https://')
      ? rawEnvBaseUrl
      : rawEnvBaseUrl.includes('localhost') || rawEnvBaseUrl.includes('127.0.0.1')
        ? `http://${rawEnvBaseUrl}`
        : `https://${rawEnvBaseUrl}`
    : ''

  const origin = envBaseUrl || request.nextUrl.origin
  return `${origin.replace(/\/+$/, '')}${normalizedPath}`
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const {packCode} = await request.json()
    const pack = getCreditPackByCode(packCode)

    if (!pack || !pack.priceId) {
      return NextResponse.json(
        {
          error: 'Invalid credit pack',
          packs: listAvailableCreditPacks(),
        },
        {status: 400},
      )
    }

    const stripe = getStripeClient()
    const successUrl = buildCheckoutReturnUrl(
      request,
      `/profilo/crediti?stripe=success&pack=${encodeURIComponent(pack.code)}`,
    )
    const cancelUrl = buildCheckoutReturnUrl(request, '/profilo/crediti?stripe=cancel')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{price: pack.priceId, quantity: 1}],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email || undefined,
      metadata: {
        user_id: user.id,
        pack_code: pack.code,
        credits_amount: String(pack.credits),
      },
    })

    try {
      const admin = createAdminSupabase()
      await admin.from('ai_credit_purchase_orders').upsert(
        {
          user_id: user.id,
          stripe_checkout_session_id: session.id,
          pack_code: pack.code,
          credits_amount: pack.credits,
          amount_cents: pack.amountCents,
          currency: pack.currency,
          status: 'pending',
          metadata: {
            checkout_url: session.url,
          },
        },
        {onConflict: 'stripe_checkout_session_id'}
      )
    } catch (error) {
      console.warn('[stripe checkout] pending order insert skipped:', error?.message || error)
    }

    return NextResponse.json({url: session.url})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
