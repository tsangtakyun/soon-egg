-- EGG authentication database. Review and approve before applying.
-- Stores only server-HMACed identifiers; never stores raw email or IP values.
create table if not exists public.egg_login_rate_limit_counters (
  key_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, bucket_start)
);

alter table public.egg_login_rate_limit_counters enable row level security;
revoke all on public.egg_login_rate_limit_counters from public, anon, authenticated;
grant select, insert, update, delete on public.egg_login_rate_limit_counters to service_role;

create or replace function public.consume_egg_login_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns table (allowed boolean, retry_after_seconds integer, request_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz;
  v_count integer;
begin
  if length(p_key_hash) < 32 or p_window_seconds < 1 or p_limit < 1 then
    raise exception 'invalid_login_rate_limit_input';
  end if;
  v_bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.egg_login_rate_limit_counters(key_hash, bucket_start, request_count)
  values (p_key_hash, v_bucket, 1)
  on conflict (key_hash, bucket_start)
  do update set request_count = public.egg_login_rate_limit_counters.request_count + 1,
                updated_at = now()
  where public.egg_login_rate_limit_counters.request_count < p_limit
  returning public.egg_login_rate_limit_counters.request_count into v_count;

  if v_count is null then
    select c.request_count into v_count
    from public.egg_login_rate_limit_counters c
    where c.key_hash = p_key_hash and c.bucket_start = v_bucket;
    return query select false,
      greatest(1, ceil(extract(epoch from (v_bucket + make_interval(secs => p_window_seconds) - now())))::integer),
      v_count;
    return;
  end if;
  return query select true, 0, v_count;
end;
$$;

revoke all on function public.consume_egg_login_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_egg_login_rate_limit(text,integer,integer) to service_role;
