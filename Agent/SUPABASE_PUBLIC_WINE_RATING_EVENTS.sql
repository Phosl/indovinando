begin;

create or replace view public.public_wine_rating_events as
  with enoteca_events as (
    select
      'enoteca'::text as source_flow,
      ets.id as session_id,
      ets.user_id as user_id,
      ets.game_id as game_id,
      ea.bottle_id as bottle_id,
      gb.canonical_wine_key as canonical_wine_key,
      gb.wine_vintage_id as wine_vintage_id,
      gb.name as wine_name,
      gb.producer as producer,
      gb.year as vintage_label,
      gb.wine_type as wine_type,
      gb.region_label as region_label,
      gb.appellation_label as appellation_label,
      gb.price_value as price_value,
      gb.price_min as price_min,
      gb.price_max as price_max,
      gb.price_currency as price_currency,
      gb.price_band as price_band,
      gq.id as question_id,
      gq.kind as question_kind,
      (gq.kind = 'rating') as is_rating_question,
      coalesce(gq.is_neutral, false) as is_neutral_question,
      case
        when gq.kind = 'rating' and gqo.text ~ '^[0-9]+([.,][0-9]+)?$'
          then replace(gqo.text, ',', '.')::numeric
        else null
      end as rating_value,
      case
        when gq.kind = 'rating' or coalesce(gq.is_neutral, false) then null
        else ea.is_correct
      end as is_correct,
      ea.points as points,
      ea.answered_at as answered_at,
      ets.completed_at as session_completed_at
    from public.enoteca_answers ea
    join public.enoteca_tasting_sessions ets
      on ets.id = ea.tasting_session_id
    join public.game_bottles gb
      on gb.id = ea.bottle_id
    join public.game_questions gq
      on gq.id = ea.question_id
    left join public.game_question_options gqo
      on gqo.id = ea.selected_option_id
    where ets.status = 'completed'
      and ets.completed_at is not null
  ),
  table_live_events as (
    select
      'table_live'::text as source_flow,
      tls.id as session_id,
      tlp.user_id as user_id,
      tls.game_id as game_id,
      gb.id as bottle_id,
      gb.canonical_wine_key as canonical_wine_key,
      gb.wine_vintage_id as wine_vintage_id,
      gb.name as wine_name,
      gb.producer as producer,
      gb.year as vintage_label,
      gb.wine_type as wine_type,
      gb.region_label as region_label,
      gb.appellation_label as appellation_label,
      gb.price_value as price_value,
      gb.price_min as price_min,
      gb.price_max as price_max,
      gb.price_currency as price_currency,
      gb.price_band as price_band,
      tlra.question_id as question_id,
      gq.kind as question_kind,
      (gq.kind = 'rating') as is_rating_question,
      coalesce(gq.is_neutral, false) as is_neutral_question,
      case
        when gq.kind = 'rating' and gqo.text ~ '^[0-9]+([.,][0-9]+)?$'
          then replace(gqo.text, ',', '.')::numeric
        else null
      end as rating_value,
      case
        when gq.kind = 'rating' or coalesce(gq.is_neutral, false) then null
        else tlra.is_correct
      end as is_correct,
      tlra.points as points,
      tlra.created_at as answered_at,
      coalesce(
        (
          select max(tler.captured_at)
          from public.table_live_event_results tler
          where tler.session_id = tls.id
        ),
        tls.updated_at,
        tls.created_at
      ) as session_completed_at
    from public.table_live_round_answers tlra
    join public.table_live_sessions tls
      on tls.id = tlra.session_id
    join public.table_live_players tlp
      on tlp.id = tlra.player_id
    join public.game_questions gq
      on gq.id = tlra.question_id
    join public.game_bottles gb
      on gb.game_id = tls.game_id
     and gb.bottle_order = tlra.bottle_index
    left join public.game_question_options gqo
      on gqo.id = tlra.selected_option_id
    where tls.status = 'finished'
  )
  select * from enoteca_events
  union all
  select * from table_live_events;

comment on view public.public_wine_rating_events is
  'Normalized wine rating and correctness events from completed Enoteca and Table Live tastings.';

commit;
