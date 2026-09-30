create unique index if not exists egg_content_packs_workspace_id_key
  on public.egg_content_packs(workspace_id, id);

create table if not exists public.egg_content_publications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  pack_id uuid,
  platform text not null default 'instagram' check (platform in ('instagram')),
  external_media_id text not null,
  media_product_type text,
  published_at timestamptz,
  paid_status text not null default 'unknown' check (paid_status in ('organic','paid','boosted','unknown')),
  link_method text not null check (link_method in ('manual','suggested_confirmed','imported','direct_publish')),
  link_confidence numeric(5,4) check (link_confidence between 0 and 1),
  lineage_status text not null check (lineage_status in ('attributed','external_content','unattributed_pre_lineage','artifact_deleted')),
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, platform, external_media_id),
  unique(workspace_id, id),
  constraint egg_publication_pack_workspace_fk
    foreign key (workspace_id, pack_id)
    references public.egg_content_packs(workspace_id, id)
);

create index if not exists egg_content_publications_workspace_idx
  on public.egg_content_publications(workspace_id, published_at desc);
create index if not exists egg_content_publications_pack_idx
  on public.egg_content_publications(workspace_id, pack_id);

alter table public.egg_content_publications enable row level security;
revoke all on public.egg_content_publications from public, anon, authenticated;
grant all on public.egg_content_publications to service_role;

notify pgrst, 'reload schema';
