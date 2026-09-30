alter table public.egg_content_packs
  add column if not exists original_content jsonb,
  add column if not exists edited_at timestamptz,
  add column if not exists edit_count integer not null default 0;

create table if not exists public.egg_preference_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id uuid not null references public.egg_content_packs(id) on delete cascade,
  recipe_id uuid references public.egg_content_recipes(id) on delete set null,
  signal_type text not null default 'content_edit',
  field_path text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists egg_preference_signals_workspace_idx
  on public.egg_preference_signals(workspace_id, created_at desc);

alter table public.egg_preference_signals enable row level security;
revoke all on public.egg_preference_signals from anon, authenticated;
grant all on public.egg_preference_signals to service_role;

notify pgrst, 'reload schema';
