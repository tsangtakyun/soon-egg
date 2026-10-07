begin;

alter table public.egg_ai_usage_events
  alter column model drop not null;

commit;
