# Supabase Security Advisor recap — 2026-06-21

## Contesto

Supabase Security Advisor segnala alcune criticità su viste, funzioni, policy RLS, storage e configurazione Auth.
Questo recap separa i fix sicuri da applicare subito dai punti che richiedono un refactor applicativo per non rompere flussi anonimi/table-live.

## File creati/aggiornati

### Da eseguire su Supabase

- `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql`
  - patch safe-first da incollare/eseguire nel SQL Editor Supabase;
  - non riscrive i flussi anonimi Enoteca/Table Live;
  - contiene anche i controlli consigliati post-esecuzione.

### App aggiornata

- `src/app/api/auto-tasting/analyze/route.js`
  - `consume_ai_scan_credits` viene chiamata con client admin/server-side;
  - questo permette di revocare `EXECUTE` a `anon`/`authenticated` sulla RPC.
- `src/lib/publicRankings.js`
  - le query ranking/statistiche pubbliche usano il client service-role quando `SUPABASE_SERVICE_ROLE_KEY` è disponibile;
  - questo permette di impostare le viste a `security_invoker = true` senza dipendere da bypass impliciti.

### SQL sorgente aggiornati

- `Agent/WINE_CATALOG_SCHEMA.sql`
- `Agent/WINE_CATALOG_DB_UPDATE_FOR_NEW_CSV.sql`
- `Agent/SUPABASE_PUBLIC_WINE_RATING_EVENTS.sql`
- `Agent/SUPABASE_PUBLIC_WINE_RANKINGS.sql`
- `Agent/SUPABASE_PUBLIC_USER_RANKINGS.sql`
- `Agent/AUTO_TASTING_MEDIA_SCHEMA.sql`
- `Agent/SUPABASE_AI_SCAN_CREDITS.sql`
- `Agent/SUPABASE_AI_CREDIT_PURCHASES.sql`
- `Agent/SUPABASE_BUSINESS_BRANDING.sql`
- `Agent/SUPABASE_RESTORE_FULL.sql`

Questi aggiornamenti servono a non reintrodurre gli stessi warning se in futuro vengono rieseguiti gli script base/restore.

## Fix preparati

### Security definer views

Advisor:

- `public.wine_catalog_producer_stats`
- `public.public_wine_rating_events`
- `public.wine_catalog`
- `public.public_wine_rankings`
- `public.public_user_rankings`

Decisione:

- Convertire le viste a `security_invoker = true`.
- Le query pubbliche delle classifiche ora usano il client server/admin quando `SUPABASE_SERVICE_ROLE_KEY` è disponibile, così le pagine pubbliche non dipendono da viste `SECURITY DEFINER`.

File app aggiornati:

- `src/lib/publicRankings.js`

SQL:

- `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql`

### SECURITY DEFINER function executable

Advisor:

- `public.consume_ai_scan_credits(uuid, integer)`
- `public.grant_ai_credit_purchase(...)`
- `public.handle_new_user_profile()`

Decisione:

- Revocare `EXECUTE` da `public`, `anon`, `authenticated`.
- Concedere `EXECUTE` solo a `service_role` per le RPC chiamate dal backend.
- `handle_new_user_profile()` resta funzione trigger, ma non deve essere eseguibile via `/rest/v1/rpc`.
- La route AI ora consuma crediti con client admin server-side.

File app aggiornati:

- `src/app/api/auto-tasting/analyze/route.js`

SQL:

- `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql`

### Function search path mutable

Advisor:

- `public.set_updated_at`
- `public.touch_ai_credit_purchase_orders_updated_at`

Decisione:

- Impostare `search_path = public` sulle funzioni trigger.

SQL:

- `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql`

### Public bucket allows listing

Advisor:

- bucket `business-branding`

Decisione:

- Droppare la policy broad `SELECT` su `storage.objects`.
- Il bucket resta pubblico: gli URL pubblici degli oggetti continuano a funzionare, ma i client non possono listare tutto il bucket via policy.

SQL:

- `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql`

### Extension in public

Advisor:

- `pg_trgm` installata in `public`

Decisione:

- Spostare l’estensione nello schema `extensions`, se presente.
- Gli indici esistenti restano validi; nei futuri SQL è meglio creare/gestire estensioni fuori da `public`.

SQL:

- `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql`

## Warning non chiusi dal fix safe-first

### RLS policy always true — Enoteca

Advisor:

- `public.enoteca_answers`
- `public.enoteca_tasting_sessions`

Stato:

- Il warning è reale: oggi il flusso enoteca anonimo permette insert/update diretti dal client.
- Cambiare solo `USING (true)` in una condizione cosmetica toglierebbe il warning ma non risolverebbe davvero la sicurezza.

Fix corretto consigliato:

1. Aggiungere un `session_token` non enumerabile alle sessioni enoteca.
2. Spostare create/update/answer su route server o RPC validate.
3. Restringere RLS a token/sessione o service role.
4. Solo dopo droppare le policy anonime broad.

### RLS enabled no policy — Table Live

Advisor:

- `public.table_live_event_results`
- `public.table_live_players`
- `public.table_live_round_answers`
- `public.table_live_sessions`

Stato:

- Nel repo esiste `Agent/TABLE_LIVE_GROUPS_SCHEMA.sql` con policy pubbliche, ma il DB reale sembra non averle o averle perse.
- Prima di applicarle così come sono va deciso se mantenere table-live anonimo via client oppure spostarlo su API server.

Fix corretto consigliato:

1. Verificare quali operazioni table-live sono ancora client-side realtime.
2. Aggiungere policy minime solo per `SELECT` realtime.
3. Spostare write sensibili su route server con service role.
4. Applicare policy RLS non broad per insert/update/delete.

### Leaked password protection disabled

Advisor:

- Supabase Auth leaked password protection disabilitata.

Fix:

- Abilitare da Dashboard Supabase: `Authentication → Providers → Email` / password security.
- Non richiede modifica repo.

## Ordine consigliato

1. Applicare `Agent/SUPABASE_SECURITY_ADVISOR_FIXES_2026_06_21.sql` in Supabase SQL Editor.
2. Ridare scan Security Advisor.
3. Testare:
   - login/registrazione nuovo utente;
   - analisi AI con consumo crediti;
   - acquisto Stripe test;
   - landing/classifiche;
   - admin catalogo vini;
   - upload logo business.
4. Pianificare refactor RLS enoteca/table-live.

## Rollback rapido

Se dopo l’applicazione emergono problemi:

1. Per classifiche/catalogo, verificare prima che `SUPABASE_SERVICE_ROLE_KEY` sia presente nell’ambiente server.
2. Per crediti AI/Stripe, verificare che le route server usino service role e non client anon/authenticated.
3. Per il bucket `business-branding`, gli URL pubblici dovrebbero continuare a funzionare; se serve temporaneamente ripristinare listing, ricreare una policy SELECT mirata solo come misura provvisoria.
4. Evitare di ripristinare `SECURITY DEFINER` sulle viste se non come emergenza temporanea: meglio correggere le policy o spostare le query su server/admin.
