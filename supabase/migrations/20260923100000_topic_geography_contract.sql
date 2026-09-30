-- Additive only: no source records, preferences or editorial content are removed.
begin;
alter table public.egg_topic_ideas
  add column if not exists countries text[] not null default '{}',
  add column if not exists regions text[] not null default '{}',
  add column if not exists localities text[] not null default '{}',
  add column if not exists geography_status text not null default 'pending',
  add column if not exists geography_evidence text not null default '',
  add column if not exists geography_version integer not null default 0;
comment on column public.egg_topic_ideas.geography_status is 'pending = extraction missing/invalid; resolved = grounded high-confidence result; unknown = no unambiguous place';
notify pgrst, 'reload schema';
commit;
