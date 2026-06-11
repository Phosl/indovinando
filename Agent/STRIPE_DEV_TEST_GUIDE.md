# Stripe Dev / Test Guide

Mini guida pratica per riprendere sviluppo e test Stripe senza dover ricostruire tutto il contesto.

## Env minime

In `.env.local` servono:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_AI_CREDITS_10=price_...
STRIPE_PRICE_AI_CREDITS_30=price_...
STRIPE_PRICE_AI_CREDITS_100=price_...

SUPABASE_SERVICE_ROLE_KEY=...
```

## Server locale

1. avvia app:

```bash
npm run dev
```

2. in un altro terminale avvia Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. copia il `whsec_...` mostrato da Stripe CLI e mettilo in `.env.local`

4. riavvia `npm run dev`

## SQL richiesto

Per il ledger ordini/ricariche va eseguito:

- `Agent/SUPABASE_AI_CREDIT_PURCHASES.sql`

Questo crea:

- `ai_credit_purchase_orders`
- `ai_credit_ledger`
- funzione `grant_ai_credit_purchase(...)`

## Flusso test standard

1. vai su `/profilo`
2. clicca `Compra crediti`
3. scegli un pack
4. completa Stripe Checkout con carta test:
   - `4242 4242 4242 4242`
   - data futura
   - CVC qualsiasi
5. al ritorno su `/profilo` verifica:
   - toast di successo
   - aumento crediti
   - comparsa nello storico crediti
6. se sei `super_admin`, verifica anche:
   - tab `Tutte le transazioni`
   - totale ordini
   - incasso
   - grafico ultimi 14 giorni

## Rotte coinvolte

- checkout: `src/app/api/stripe/checkout-session/route.js`
- webhook: `src/app/api/stripe/webhook/route.js`
- config Stripe: `src/lib/stripe.js`
- Supabase admin client: `src/lib/supabaseAdmin.js`
- UI profilo: `src/app/profilo/ProfileClient.jsx`

## Problemi noti / check rapidi

### `Not a valid URL`

Controlla:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

La route ora ha anche un fallback su `request.nextUrl.origin`, ma conviene comunque tenere la env.

### `You specified payment mode but passed a recurring price`

Almeno un `price_...` Stripe e stato creato come ricorrente.

Serve che i prezzi dei pacchetti crediti siano:

- `Una tantum`

non:

- `Ricorrente`

### Il pagamento va a buon fine ma i crediti non si aggiornano

Controlla in ordine:

1. `stripe listen` attivo
2. `STRIPE_WEBHOOK_SECRET` corretto
3. `SUPABASE_SERVICE_ROLE_KEY` presente
4. SQL `SUPABASE_AI_CREDIT_PURCHASES.sql` eseguito

## Produzione

In produzione:

- non si usa `stripe listen`
- si configura un webhook reale in Stripe Dashboard verso:
  - `https://indovinando.vercel.app/api/stripe/webhook`

Poi si sostituiscono:

- chiavi test -> live
- price test -> price live

## Nota Apple Pay / Google Pay

Per ora i test migliori restano con carta `4242...`.

I wallet si potranno testare meglio dopo aver chiuso:

- webhook live
- dominio verificato
- setup produzione Stripe completo
