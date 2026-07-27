# Audit SEO e GEO — 24 luglio 2026

## Situazione iniziale

- La home pubblica non esponeva `title`, meta description, canonical, Open Graph o Twitter Card.
- `/robots.txt` e `/sitemap.xml` rispondevano `404`.
- Le aree private non inviavano un segnale HTTP uniforme di esclusione dall'indice.
- Landing, classifiche, partner e corso non avevano una strategia condivisa per metadata e dati strutturati.
- I fallback pubblici potevano mostrare ranking, utenti, partner e numeri dimostrativi come se fossero dati reali.

## Interventi applicati

- Fonte condivisa per origin canonico, metadata, social preview, robots e serializzazione JSON-LD.
- Metadata localizzati e canonical per home, demo, classifiche, vini, partner, corso e pagine informative.
- `robots.txt` con contenuti pubblici accessibili a `OAI-SearchBot`, API escluse e `GPTBot` disabilitato.
- Sitemap dinamica con pagine principali, partner pubblici, vini reali e sole lezioni accessibili senza login.
- `X-Robots-Tag: noindex, nofollow` sulle aree private, operative e duplicate.
- JSON-LD coerente con i contenuti visibili: `Organization`, `WebSite`, `WebApplication`, `FAQPage`, `CollectionPage`, `ItemList`, `Dataset`, `LocalBusiness`, `Course`, `LearningResource` e breadcrumb.
- Testi landing più espliciti su preparazione, questionario, QR, accesso da browser, risultati e demo.
- Rimossi i dati dimostrativi dai fallback pubblici: in assenza di dati reali viene mostrato uno stato vuoto.
- Immagini partner abilitate per l'ottimizzazione Next.js tramite il dominio Storage Supabase configurato.
- Aggiunta immagine social dedicata JPEG 1200×630 da 238 KB, riutilizzata da tutte le pagine pubbliche per evitare anteprime SVG incompatibili.
- Eliminate query duplicate in home e nelle route dinamiche vino/partner; centralizzata anche la validazione dei redirect interni.
- Aggiunto smoke test pubblico riutilizzabile `npm run check:public -- <base-url>`.

## Validazione locale

- Build production Next.js completata.
- Lint mirato sui file coinvolti senza errori o warning.
- JSON italiano e inglese validi.
- `git diff --check` pulito.
- Home: title, description, canonical, Open Graph, Twitter Card e JSON-LD presenti.
- Pagine pubbliche principali: `index, follow` e canonical corretti.
- Aree private: header `X-Robots-Tag: noindex, nofollow`.
- Sitemap verificata nuovamente il 27 luglio con 44 URL reali.
- User-agent WhatsApp/social: title, description, canonical e immagine assoluta corretti.
- Asset social: HTTP 200, `image/jpeg`, 1200×630, 238264 byte.
- Smoke table-live superato nelle modalità `instant` ed `end`, con due giocatori e cleanup automatico.

## Decisioni GEO

- Non è stato aggiunto `llms.txt`: non è necessario per Google AI features e non sostituisce SEO, contenuti testuali, link interni e indicizzazione.
- FAQ e dati strutturati descrivono solo funzioni e contenuti realmente visibili.
- I dati generati dagli utenti vengono pubblicati solo quando provengono dalle viste reali del database.
- `OAI-SearchBot` può leggere le pagine pubbliche e citabili; `GPTBot` è escluso per separare la ricerca ChatGPT dall’uso potenziale per training.
- Aree private, duplicati interni e API restano esclusi o marcati `noindex`.

## Passi dopo il deploy

1. Verificare `https://indovinando.vercel.app/robots.txt`.
2. Verificare `https://indovinando.vercel.app/sitemap.xml`.
3. Aggiungere la proprietà in Google Search Console e inviare la sitemap.
4. Controllare home, classifiche, partner e corso con URL Inspection.
5. Validare i JSON-LD con Rich Results Test e Schema Markup Validator.
6. Monitorare query, pagine indicizzate, referral ChatGPT e conversioni demo/registrazione.
7. Verificare nei log o nel firewall Vercel che `OAI-SearchBot` non riceva blocchi automatici.

## Evoluzione consigliata

- Creare URL linguistiche distinte, per esempio `/en`, prima di puntare seriamente al traffico internazionale.
- Aggiungere pagine editoriali originali su organizzazione, schede e metodi di degustazione alla cieca.
- Collegare Search Console e analytics alla centralina super-admin quando servirà un monitoraggio continuativo.
