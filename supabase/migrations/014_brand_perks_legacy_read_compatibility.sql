-- Emergency compatibility for the currently deployed Egg.soon frontend.
-- The legacy browser queries only these public perk fields. Contact fields stay
-- inaccessible until the service-role API releases them to an eligible claim.
revoke all on table public.brand_perks from anon, authenticated;

grant select (
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
) on table public.brand_perks to anon, authenticated;

drop policy if exists "Public read non-contact brand perks" on public.brand_perks;
create policy "Public read non-contact brand perks"
  on public.brand_perks
  for select
  to anon, authenticated
  using (true);
