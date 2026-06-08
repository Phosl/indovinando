begin;

alter table public.wine_course_progress
  add column if not exists max_score integer not null default 0;

update public.wine_course_progress
set
  score = greatest(coalesce(score, 0), 0),
  max_score = greatest(coalesce(max_score, 0), coalesce(score, 0), 0),
  attempts = greatest(coalesce(attempts, 0), case when completed then 1 else 0 end),
  completed_at = case
    when completed and completed_at is null then updated_at
    else completed_at
  end,
  updated_at = coalesce(updated_at, now());

with ranked as (
  select
    id,
    user_id,
    level_id,
    lesson_id,
    row_number() over (
      partition by user_id, level_id, lesson_id
      order by completed desc, score desc, max_score desc, attempts desc, coalesce(completed_at, updated_at) desc, updated_at desc, id desc
    ) as rn,
    max(completed::int) over (partition by user_id, level_id, lesson_id) as best_completed,
    max(score) over (partition by user_id, level_id, lesson_id) as best_score,
    max(max_score) over (partition by user_id, level_id, lesson_id) as best_max_score,
    max(attempts) over (partition by user_id, level_id, lesson_id) as best_attempts,
    max(completed_at) over (partition by user_id, level_id, lesson_id) as best_completed_at,
    max(updated_at) over (partition by user_id, level_id, lesson_id) as best_updated_at
  from public.wine_course_progress
), keepers as (
  update public.wine_course_progress wcp
  set
    completed = ranked.best_completed = 1,
    score = ranked.best_score,
    max_score = greatest(ranked.best_max_score, ranked.best_score),
    attempts = ranked.best_attempts,
    completed_at = case
      when ranked.best_completed = 1 then coalesce(ranked.best_completed_at, wcp.completed_at, wcp.updated_at)
      else null
    end,
    updated_at = coalesce(ranked.best_updated_at, wcp.updated_at, now())
  from ranked
  where ranked.id = wcp.id
    and ranked.rn = 1
  returning ranked.user_id, ranked.level_id, ranked.lesson_id
)
delete from public.wine_course_progress wcp
using ranked
where ranked.id = wcp.id
  and ranked.rn > 1;

commit;
