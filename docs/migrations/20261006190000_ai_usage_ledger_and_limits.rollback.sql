-- Roll back only objects created by 20261006190000_ai_usage_ledger_and_limits.sql.
-- Intentionally no CASCADE: a dependency should stop rollback for manual review.

drop function if exists public.consume_egg_ai_rate_limit(uuid,uuid,text,integer,integer);
drop index if exists public.egg_ai_usage_events_feature_created_idx;
drop index if exists public.egg_ai_usage_events_workspace_created_idx;
drop table if exists public.egg_ai_rate_limit_counters;
drop table if exists public.egg_ai_usage_events;

notify pgrst, 'reload schema';
