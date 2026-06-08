begin;

alter table if exists public.game_bottles
  add column if not exists canonical_wine_key text,
  add column if not exists wine_vintage_id uuid,
  add column if not exists price_value numeric(10,2),
  add column if not exists price_min numeric(10,2),
  add column if not exists price_max numeric(10,2),
  add column if not exists price_currency text,
  add column if not exists price_band text,
  add column if not exists region_label text,
  add column if not exists appellation_label text;

create index if not exists idx_game_bottles_canonical_wine_key
  on public.game_bottles(canonical_wine_key);

create index if not exists idx_game_bottles_wine_vintage_id
  on public.game_bottles(wine_vintage_id);

commit;
