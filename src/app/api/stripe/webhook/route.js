import {NextResponse} from 'next/server'
import {createAdminSupabase} from '@/lib/supabaseAdmin'
import {getCreditPackByCode, getStripeClient} from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({error: 'Missing Stripe webhook configuration'}, {status: 400})
  }

  try {
    const stripe = getStripeClient()
    const payload = await request.text()
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const packCode = String(session.metadata?.pack_code || '').trim()
      const userId = String(session.metadata?.user_id || '').trim()
      const metadataCredits = Number(session.metadata?.credits_amount || 0)
      const pack = getCreditPackByCode(packCode)
      const creditsAmount = Number.isFinite(metadataCredits) && metadataCredits > 0
        ? Math.trunc(metadataCredits)
        : pack?.credits || 0

      if (!userId || !packCode || creditsAmount <= 0) {
        throw new Error('Missing checkout metadata required to grant credits')
      }

      const admin = createAdminSupabase()
      const {error} = await admin.rpc('grant_ai_credit_purchase', {
        p_checkout_session_id: session.id,
        p_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        p_customer_id: typeof session.customer === 'string' ? session.customer : null,
        p_user_id: userId,
        p_pack_code: packCode,
        p_credits_amount: creditsAmount,
        p_amount_cents: session.amount_total || pack?.amountCents || 0,
        p_currency: session.currency || pack?.currency || 'eur',
        p_metadata: {
          livemode: session.livemode,
          customer_email: session.customer_details?.email || null,
        },
      })

      if (error) {
        throw error
      }
    }

    return NextResponse.json({received: true})
  } catch (error) {
    console.error('[stripe webhook]', error)
    return NextResponse.json({error: error?.message || 'Webhook error'}, {status: 400})
  }
}
