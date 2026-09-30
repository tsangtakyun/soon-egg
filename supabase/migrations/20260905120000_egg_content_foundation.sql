create table if not exists public.egg_content_recipes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  platform text not null default 'instagram',
  format text not null check (format in ('short_video', 'carousel', 'single_image', 'snapshot_reference')),
  production_mode text not null check (production_mode in ('presenter', 'presenter_plus_vo', 'full_vo', 'ai_visual', 'carousel', 'single_image', 'snapshot_reference')),
  config jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  is_system_template boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.egg_content_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  origin text not null default 'egg_this' check (origin in ('egg_this', 'daily_recommendation', 'topic_library')),
  source_type text not null check (source_type in ('text', 'url', 'image', 'soon_topic', 'workspace_topic')),
  source_topic_id uuid,
  source_data jsonb not null default '{}'::jsonb,
  topic_summary text not null default '',
  status text not null default 'draft' check (status in ('draft', 'angles_ready', 'pack_ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.egg_content_angles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.egg_content_projects(id) on delete cascade,
  label text not null,
  premise text not null,
  audience_promise text not null default '',
  editorial_lens text not null default '',
  rationale text not null default '',
  risk_flags jsonb not null default '[]'::jsonb,
  rank integer not null default 0,
  selected_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.egg_content_packs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  project_id uuid not null references public.egg_content_projects(id) on delete cascade,
  angle_id uuid not null references public.egg_content_angles(id) on delete restrict,
  recipe_id uuid not null references public.egg_content_recipes(id) on delete restrict,
  content jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  model text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists egg_content_recipes_workspace_idx on public.egg_content_recipes(workspace_id, is_active, updated_at desc);
create index if not exists egg_content_projects_workspace_idx on public.egg_content_projects(workspace_id, created_at desc);
create index if not exists egg_content_angles_project_idx on public.egg_content_angles(project_id, rank);
create index if not exists egg_content_packs_workspace_idx on public.egg_content_packs(workspace_id, created_at desc);
create unique index if not exists egg_content_recipe_system_key on public.egg_content_recipes(workspace_id, production_mode) where is_system_template = true;

alter table public.egg_content_recipes enable row level security;
alter table public.egg_content_projects enable row level security;
alter table public.egg_content_angles enable row level security;
alter table public.egg_content_packs enable row level security;

revoke all on public.egg_content_recipes from anon, authenticated;
revoke all on public.egg_content_projects from anon, authenticated;
revoke all on public.egg_content_angles from anon, authenticated;
revoke all on public.egg_content_packs from anon, authenticated;
grant all on public.egg_content_recipes to service_role;
grant all on public.egg_content_projects to service_role;
grant all on public.egg_content_angles to service_role;
grant all on public.egg_content_packs to service_role;


notify pgrst, 'reload schema';
