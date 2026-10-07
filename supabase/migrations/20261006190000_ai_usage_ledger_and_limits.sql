begin;

create table public.egg_ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique,
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  operation text not null,
  provider text not null,
  model text,
  requested_model text,
  provider_request_id text,
  status text not null check (status in ('started','succeeded','failed','cancelled')),
  attempt integer not null default 1 check (attempt > 0),
  max_attempts_configured integer check (max_attempts_configured is null or max_attempts_configured > 0),
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  cache_read_tokens bigint check (cache_read_tokens is null or cache_read_tokens >= 0),
  cache_write_tokens bigint check (cache_write_tokens is null or cache_write_tokens >= 0),
  web_search_requests integer check (web_search_requests is null or web_search_requests >= 0),
  image_spec jsonb not null default '{}'::jsonb check (jsonb_typeof(image_spec) = 'object'),
  audio_seconds numeric(12,3) check (audio_seconds is null or audio_seconds >= 0),
  est_cost_hkd numeric(18,8) check (est_cost_hkd is null or est_cost_hkd >= 0),
  web_search_est_cost_hkd numeric(18,8) check (web_search_est_cost_hkd is null or web_search_est_cost_hkd >= 0),
  actual_cost_hkd numeric(18,8) check (actual_cost_hkd is null or actual_cost_hkd >= 0),
  price_version text,
  actual_cost_source text,
  benchmark_batch_id text,
  benchmark_action text,
  benchmark_run integer check (benchmark_run is null or benchmark_run > 0),
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.egg_ai_usage_events.image_spec is
  'Non-content image metadata only (count, byte count, MIME types, dimensions when known).';
comment on column public.egg_ai_usage_events.actual_cost_hkd is
  'Provider-confirmed actual cost only. Remains NULL when provider billing is unavailable.';
comment on column public.egg_ai_usage_events.error_code is
  'Sanitized machine-readable error code only; never prompt, response, or sensitive error text.';

create index egg_ai_usage_events_workspace_created_idx
  on public.egg_ai_usage_events(workspace_id, created_at desc);
create index egg_ai_usage_events_feature_created_idx
  on public.egg_ai_usage_events(feature, created_at desc);

alter table public.egg_ai_usage_events enable row level security;
revoke all on public.egg_ai_usage_events from public, anon, authenticated;
grant select, insert, update on public.egg_ai_usage_events to service_role;

create table public.egg_ai_rate_limit_counters (
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  window_kind text not null check (window_kind in ('minute','day_utc')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id, feature, window_kind, window_start)
);

alter table public.egg_ai_rate_limit_counters enable row level security;
revoke all on public.egg_ai_rate_limit_counters from public, anon, authenticated;
grant select, insert, update, delete on public.egg_ai_rate_limit_counters to service_role;

create function public.consume_egg_ai_rate_limit(
  p_workspace_id uuid,
  p_user_id uuid,
  p_feature text,
  p_minute_limit integer,
  p_day_limit integer
)
returns table (allowed boolean, retry_after_seconds integer, minute_count integer, day_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_minute_start timestamptz := date_trunc('minute', v_now);
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
begin
  if p_workspace_id is null or p_user_id is null or p_feature is null
     or p_minute_limit < 1 or p_day_limit < 1 then
    raise exception 'invalid_rate_limit_input';
  end if;

  insert into public.egg_ai_rate_limit_counters
    (workspace_id,user_id,feature,window_kind,window_start,request_count)
  values (p_workspace_id,p_user_id,p_feature,'minute',v_minute_start,1)
  on conflict (workspace_id,user_id,feature,window_kind,window_start)
  do update set request_count = public.egg_ai_rate_limit_counters.request_count + 1,
                updated_at = v_now
  where public.egg_ai_rate_limit_counters.request_count < p_minute_limit
  returning request_count into minute_count;

  if minute_count is null then
    select request_count into minute_count
    from public.egg_ai_rate_limit_counters
    where workspace_id=p_workspace_id and user_id=p_user_id and feature=p_feature
      and window_kind='minute' and window_start=v_minute_start;
    allowed := false;
    retry_after_seconds := greatest(1, 60 - extract(second from v_now)::integer);
    day_count := 0;
    return next;
    return;
  end if;

  insert into public.egg_ai_rate_limit_counters
    (workspace_id,user_id,feature,window_kind,window_start,request_count)
  values (p_workspace_id,p_user_id,p_feature,'day_utc',v_day_start,1)
  on conflict (workspace_id,user_id,feature,window_kind,window_start)
  do update set request_count = public.egg_ai_rate_limit_counters.request_count + 1,
                updated_at = v_now
  where public.egg_ai_rate_limit_counters.request_count < p_day_limit
  returning request_count into day_count;

  if day_count is null then
    select request_count into day_count
    from public.egg_ai_rate_limit_counters
    where workspace_id=p_workspace_id and user_id=p_user_id and feature=p_feature
      and window_kind='day_utc' and window_start=v_day_start;
    allowed := false;
    retry_after_seconds := greatest(1, extract(epoch from (v_day_start + interval '1 day' - v_now))::integer);
    return next;
    return;
  end if;

  allowed := true;
  retry_after_seconds := 0;
  return next;
end;
$$;

revoke all on function public.consume_egg_ai_rate_limit(uuid,uuid,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_egg_ai_rate_limit(uuid,uuid,text,integer,integer)
  to service_role;

notify pgrst, 'reload schema';

commit;
