create table if not exists public.creator_dna_profiles (
  workspace_id uuid primary key references public.egg_creator_profiles(id) on delete cascade,
  primary_industry_code text not null,
  secondary_industry_codes text[] not null default '{}',
  content_styles text[] not null default '{}',
  preferred_formats text[] not null default '{}',
  audience_summary text,
  collaboration_preferences text[] not null default '{}',
  excluded_industries text[] not null default '{}',
  profile_status text not null default 'draft' check (profile_status in ('draft','confirmed')),
  profile_version integer not null default 1,
  inferred_from jsonb not null default '{}'::jsonb,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.creator_dna_profiles enable row level security;
revoke all on public.creator_dna_profiles from public,anon,authenticated;
grant all on public.creator_dna_profiles to service_role;

insert into public.creator_dna_profiles(workspace_id,primary_industry_code,secondary_industry_codes,content_styles,preferred_formats,audience_summary,inferred_from)
select id,'trend_culture',array['food_beverage','travel_experience'],array['文化觀察','生活故事','城市熱話'],array['reels','feed','carousel'],coalesce(ai_profile_summary,bio),jsonb_build_object('content_categories',content_categories,'source','existing_creator_profile')
from public.egg_creator_profiles
where lower(coalesce(username,''))='egg.soon'
on conflict (workspace_id) do nothing;
