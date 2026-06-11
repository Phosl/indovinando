# Stripe Credits Plan

Piano minimo e pragmatico per monetizzare Indovinando senza introdurre subito abbonamenti.

## Obiettivo

Vendere **pacchetti di crediti AI** una tantum per il riconoscimento bottiglie.

Scelta consigliata:

- niente `Pro / Business` subito
- niente limiti complicati per feature generiche
- sì a pack semplici e comprensibili

## Perché partire dai crediti

- l'utente capisce subito il valore: paga per riconoscere bottiglie
- il costo è collegato a un'azione costosa per noi
- non blocchiamo il prodotto con logiche subscription troppo presto
- possiamo validare domanda reale prima di introdurre piani ricorrenti

## Modello business consigliato

### Fase 1 — una tantum

- `10 crediti` → `€1.99`
- `30 crediti` → `€4.99`
- `100 crediti` → `€12.99`

Regola semplice iniziale:

- `1 credito` = riconoscimento AI di `1 bottiglia`
- la web search automatica resta inclusa nello stesso credito finché vogliamo massimizzare la
  qualità percepita

## Prodotto consigliato

### Utenti anonimi

- vedono il corso parziale
- possono capire il prodotto
- possono arrivare al wizard automatico
- per acquistare crediti devono registrarsi

### Utenti registrati

- ricevono crediti iniziali
- consumano crediti nell'auto tasting
- possono acquistare ricariche

## Scelta tecnica Stripe

### Consigliato subito

- `Stripe Checkout`
- 1 checkout per pack
- webhook server-side per conferma pagamento

### Perché

- integrazione più veloce
- UI pagamento già pronta
- supporto nativo a wallet come Apple Pay / Google Pay tramite Stripe
- meno edge case rispetto a una UI custom completa

## Flusso utente consigliato

1. Utente clicca `Compra crediti`
2. Sceglie un pack
3. Backend crea una `Checkout Session`
4. Stripe apre la pagina pagamento
5. Al pagamento completato Stripe chiama il webhook
6. Il webhook salva l'ordine e accredita i crediti
7. Il profilo aggiorna il saldo

## Scelta DB consigliata

Non basta più il solo contatore aggregato in `profiles`.

Serve affiancare:

- una tabella ordini/pagamenti
- un ledger dei movimenti crediti

Il contatore attuale resta utile come **cache di saldo** compatibile con il client esistente.

## Regola pratica di accredito

Per non rompere l'app esistente:

- i crediti acquistati vengono aggiunti per ora a `profiles.ai_scan_credits_bonus`
- il ledger diventa la fonte di audit
- più avanti possiamo introdurre un campo dedicato `purchased` senza fretta

## Cosa fare su Stripe

### 1. Crea account e modalità test

- entra in Stripe Dashboard
- resta in `Test mode`

### 2. Crea i prodotti

Crea 3 prodotti:

- `AI Credits 10`
- `AI Credits 30`
- `AI Credits 100`

Per ciascuno crea un prezzo:

- `1.99 EUR`
- `4.99 EUR`
- `12.99 EUR`

### 3. Salva i Price ID

Ti serviranno gli ID tipo:

- `price_xxx`

Da mettere in env, per esempio:

- `STRIPE_PRICE_AI_CREDITS_10`
- `STRIPE_PRICE_AI_CREDITS_30`
- `STRIPE_PRICE_AI_CREDITS_100`

### 4. Recupera le chiavi

In Stripe prendi:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 5. Configura il webhook

Crea un endpoint webhook verso:

- `/api/stripe/webhook`

Evento minimo da ascoltare:

- `checkout.session.completed`

Opzionali utili:

- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

Poi salva:

- `STRIPE_WEBHOOK_SECRET`

### 6. Wallet

Per Apple Pay / Google Pay:

- se usi Stripe Checkout, i wallet sono gestiti da Stripe dove disponibili
- per Apple Pay web devi comunque verificare il dominio in Stripe quando vai in produzione

## Env vars consigliate

```bash
NEXT_PUBLIC_APP_URL=https://indovinando.vercel.app

STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

STRIPE_PRICE_AI_CREDITS_10=price_...
STRIPE_PRICE_AI_CREDITS_30=price_...
STRIPE_PRICE_AI_CREDITS_100=price_...
```

## API da creare nel progetto

### `POST /api/stripe/checkout-session`

Input:

- `packCode`

Fa:

- verifica utente autenticato
- mappa `packCode` -> `priceId`
- crea Checkout Session
- salva record ordine iniziale `pending`
- ritorna `url`

### `POST /api/stripe/webhook`

Fa:

- verifica firma Stripe
- gestisce `checkout.session.completed`
- salva/aggiorna ordine
- accredita i crediti in modo idempotente
- scrive il movimento nel ledger

## UI minima da fare

- card `Crediti` in profilo con CTA `Compra crediti`
- modal/pagina con 3 pack
- stato saldo nel wizard automatico già c'è quasi tutto
- storico ricariche in profilo come step successivo

## Step implementativi consigliati

1. aggiungere libreria Stripe al progetto
2. creare schema DB ordini + ledger
3. creare route checkout session
4. creare webhook idempotente
5. aggiungere CTA acquisto in profilo
6. mostrare toast/success page post-acquisto
7. aggiungere storico ricariche
