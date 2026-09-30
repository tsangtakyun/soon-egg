alter table public.egg_preference_signals
  add column if not exists is_active boolean not null default true,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null;

create index if not exists egg_preference_signals_active_idx
  on public.egg_preference_signals(workspace_id, is_active, created_at desc);

notify pgrst, 'reload schema';
