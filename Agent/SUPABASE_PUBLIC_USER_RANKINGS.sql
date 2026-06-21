begin;

create or replace view public.public_user_rankings
with (security_invoker = true)
as
  with base as (
    select
      pwre.user_id,
      coalesce(nullif(trim(p.username), ''), 'Utente') as display_name,
      p.profile_type,
      count(distinct pwre.session_id) as session_count,
      count(*) filter (
        where not pwre.is_rating_question
          and not pwre.is_neutral_question
          and pwre.is_correct is not null
      ) as objective_answer_count,
      count(*) filter (
        where not pwre.is_rating_question
          and not pwre.is_neutral_question
          and pwre.is_correct = true
      ) as objective_correct_count,
      avg(
        case
          when not pwre.is_rating_question
            and not pwre.is_neutral_question
            and pwre.is_correct is not null
          then case when pwre.is_correct then 1.0 else 0.0 end
          else null
        end
      ) as correctness_ratio,
      count(*) filter (where pwre.is_rating_question and pwre.rating_value is not null) as rating_answer_count,
      avg(pwre.rating_value) filter (where pwre.is_rating_question and pwre.rating_value is not null) as blind_rating_avg,
      coalesce(sum(pwre.points), 0) as total_points,
      avg(pwre.points) as avg_points_per_answer,
      max(pwre.session_completed_at) as last_activity_at
    from public.public_wine_rating_events pwre
    join public.profiles p
      on p.id = pwre.user_id
    where pwre.user_id is not null
    group by pwre.user_id, p.username, p.profile_type
  ),
  computed as (
    select
      *,
      case
        when objective_answer_count >= 12 and session_count >= 3 then true
        else false
      end as eligible_precision
    from base
  )
  select
    user_id,
    display_name,
    profile_type,
    session_count,
    objective_answer_count,
    objective_correct_count,
    correctness_ratio,
    rating_answer_count,
    blind_rating_avg,
    total_points,
    avg_points_per_answer,
    last_activity_at,
    eligible_precision,
    case
      when eligible_precision
      then row_number() over (
        order by correctness_ratio desc nulls last, objective_answer_count desc, session_count desc, total_points desc, display_name asc
      )
      else null
    end as precision_rank
  from computed;

comment on view public.public_user_rankings is
  'Aggregated public user skill rankings for registered users, based on completed Enoteca and Table Live answers.';

commit;
