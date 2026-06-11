import Stripe from 'stripe'

let stripeClient = null

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

export function getStripeClient() {
  if (stripeClient) return stripeClient
  stripeClient = new Stripe(requireEnv('STRIPE_SECRET_KEY'))
  return stripeClient
}

export const AI_CREDIT_PACKS = [
  {
    code: 'credits_10',
    credits: 10,
    amountCents: 199,
    currency: 'eur',
    priceId: process.env.STRIPE_PRICE_AI_CREDITS_10 || '',
  },
  {
    code: 'credits_30',
    credits: 30,
    amountCents: 499,
    currency: 'eur',
    priceId: process.env.STRIPE_PRICE_AI_CREDITS_30 || '',
  },
  {
    code: 'credits_100',
    credits: 100,
    amountCents: 1299,
    currency: 'eur',
    priceId: process.env.STRIPE_PRICE_AI_CREDITS_100 || '',
  },
]

export function getCreditPackByCode(packCode) {
  return AI_CREDIT_PACKS.find((pack) => pack.code === packCode) || null
}

export function listAvailableCreditPacks() {
  return AI_CREDIT_PACKS.filter((pack) => Boolean(pack.priceId)).map((pack) => ({
    code: pack.code,
    credits: pack.credits,
    amountCents: pack.amountCents,
    currency: pack.currency,
  }))
}
