begin;

create or replace view public.public_wine_rankings
with (security_invoker = true)
as
  with grouped_events as (
    select
      coalesce(
        case
          when pwre.wine_vintage_id is not null then 'v:' || pwre.wine_vintage_id::text
          else null
        end,
        case
          when pwre.canonical_wine_key is not null and pwre.canonical_wine_key <> '' then 'c:' || pwre.canonical_wine_key
          else null
        end,
        'b:' || pwre.bottle_id::text
      ) as wine_group_key,
      pwre.*
    from public.public_wine_rating_events pwre
  ),
  aggregated as (
    select
      wine_group_key,
      max(canonical_wine_key) as canonical_wine_key,
      max(wine_vintage_id) as wine_vintage_id,
      max(wine_name) as display_name,
      max(producer) as producer,
      max(vintage_label) as vintage_label,
      max(wine_type) as wine_type,
      max(region_label) as region_label,
      max(appellation_label) as appellation_label,
      avg(price_value) filter (where price_value is not null) as avg_price_value,
      avg(price_min) filter (where price_min is not null) as avg_price_min,
      avg(price_max) filter (where price_max is not null) as avg_price_max,
      max(price_currency) as price_currency,
      max(price_band) as price_band,
      count(*) filter (where is_rating_question and rating_value is not null) as rating_count,
      count(distinct session_id) filter (where is_rating_question and rating_value is not null) as rating_session_count,
      count(*) filter (
        where not is_rating_question
          and not is_neutral_question
          and is_correct is not null
      ) as objective_answer_count,
      count(distinct session_id) as total_session_count,
      avg(rating_value) filter (where is_rating_question and rating_value is not null) as blind_score,
      avg(
        case
          when not is_rating_question and not is_neutral_question and is_correct is not null
            then case when is_correct then 1.0 else 0.0 end
          else null
        end
      ) as correctness_ratio,
      stddev_samp(rating_value) filter (where is_rating_question and rating_value is not null) as divisive_score
    from grouped_events
    group by wine_group_key
  ),
  computed as (
    select
      *,
      case
        when rating_count >= 5 then true
        else false
      end as eligible_blind,
      case
        when rating_count >= 5
          and rating_session_count >= 3
          and avg_price_value is not null
          and avg_price_value > 0
        then true
        else false
      end as eligible_quality_price,
      case
        when rating_count >= 5
          and rating_session_count >= 3
          and correctness_ratio is not null
        then true
        else false
      end as eligible_surprising,
      case
        when rating_count >= 8
          and rating_session_count >= 3
          and divisive_score is not null
        then true
        else false
      end as eligible_divisive,
      case
        when avg_price_value is not null and avg_price_value > 0
          then blind_score / ln(avg_price_value + 1)
        else null
      end as quality_price_score,
      case
        when correctness_ratio is not null
          then blind_score - (correctness_ratio * 10)
        else null
      end as surprise_score
    from aggregated
  ),
  ranked as (
    select
      *,
      case
        when eligible_blind then row_number() over (order by blind_score desc nulls last, rating_count desc, display_name asc)
        else null
      end as blind_rank,
      case
        when eligible_quality_price then row_number() over (order by quality_price_score desc nulls last, rating_count desc, display_name asc)
        else null
      end as quality_price_rank,
      case
        when eligible_surprising then row_number() over (order by surprise_score desc nulls last, rating_count desc, display_name asc)
        else null
      end as surprise_rank,
      case
        when eligible_divisive then row_number() over (order by divisive_score desc nulls last, rating_count desc, display_name asc)
        else null
      end as divisive_rank
    from computed
  )
  select
    wine_group_key,
    canonical_wine_key,
    wine_vintage_id,
    display_name,
    producer,
    vintage_label,
    wine_type,
    region_label,
    appellation_label,
    avg_price_value,
    avg_price_min,
    avg_price_max,
    price_currency,
    price_band,
    rating_count,
    rating_session_count,
    objective_answer_count,
    total_session_count,
    blind_score,
    correctness_ratio,
    quality_price_score,
    surprise_score,
    divisive_score,
    eligible_blind,
    eligible_quality_price,
    eligible_surprising,
    eligible_divisive,
    blind_rank,
    quality_price_rank,
    surprise_rank,
    divisive_rank
  from ranked;

comment on view public.public_wine_rankings is
  'Aggregated public wine rankings computed from normalized tasting events.';

commit;
