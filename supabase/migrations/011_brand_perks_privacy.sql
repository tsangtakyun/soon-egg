alter table public.brand_perks enable row level security;

drop policy if exists "Public read brand_perks" on public.brand_perks;
revoke all on table public.brand_perks from public, anon, authenticated;
grant all on table public.brand_perks to service_role;

drop view if exists public.brand_perks_public;
create view public.brand_perks_public
with (security_barrier = true)
as
select
  id,
  cw_workspace_id,
  brand_name,
  brand_website,
  brand_logo_url,
  type,
  title,
  description,
  requirements,
  quota,
  claimed_count,
  valid_until,
  is_active,
  created_at
from public.brand_perks;

revoke all on table public.brand_perks_public from public, anon, authenticated;
grant select on table public.brand_perks_public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

