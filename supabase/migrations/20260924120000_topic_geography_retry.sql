begin;
alter table public.egg_topic_ideas
  add column if not exists geography_kind text not null default 'unknown',
  add column if not exists geography_source_text text not null default '',
  add column if not exists geography_sources jsonb not null default '[]'::jsonb,
  add column if not exists geography_attempts integer not null default 0,
  add column if not exists geography_retry_at timestamptz,
  add column if not exists geography_error text;
-- Existing v1 extraction meant actual places only. Keep backwards compatibility.
update public.egg_topic_ideas set geography_kind='place'
where geography_version=1 and geography_status='resolved' and geography_kind='unknown';
comment on column public.egg_topic_ideas.geography_kind is 'place = actual destination; context = related country only, never nearby; none = non-geographic; unknown = needs evidence';
create index if not exists egg_topic_geography_retry_idx on public.egg_topic_ideas(geography_retry_at)
where geography_retry_at is not null;
notify pgrst, 'reload schema';
commit;
