-- Replace legacy policies that incorrectly compared auth.uid() with creator_id.
-- creator_id references egg_creator_profiles.id; ownership must be resolved via profile.user_id.

drop policy if exists "Auth manage own brand_partners" on public.egg_brand_partners;
drop policy if exists "Public read brand_partners" on public.egg_brand_partners;
drop policy if exists "egg_users_manage_own_brand_partners" on public.egg_brand_partners;
drop policy if exists "egg_public_brand_partners_viewable" on public.egg_brand_partners;

create policy "Creators manage own brand partners"
  on public.egg_brand_partners
  for all
  to authenticated
  using (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  );

create policy "Public views brand partners on public media kits"
  on public.egg_brand_partners
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.mediakit_is_public = true
        and coalesce(profile.mediakit_access_level, 'public') <> 'private'
    )
  );

drop policy if exists "Auth manage own case_studies" on public.egg_case_studies;
drop policy if exists "Public read case_studies" on public.egg_case_studies;
drop policy if exists "egg_users_manage_own_case_studies" on public.egg_case_studies;
drop policy if exists "egg_public_case_studies_viewable" on public.egg_case_studies;

create policy "Creators manage own case studies"
  on public.egg_case_studies
  for all
  to authenticated
  using (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  );

create policy "Public views case studies on public media kits"
  on public.egg_case_studies
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.mediakit_is_public = true
        and coalesce(profile.mediakit_access_level, 'public') <> 'private'
    )
  );

drop policy if exists "Auth manage own rate_cards" on public.egg_rate_cards;
drop policy if exists "Public read rate_cards" on public.egg_rate_cards;
drop policy if exists "egg_users_manage_own_rate_cards" on public.egg_rate_cards;
drop policy if exists "egg_public_active_rate_cards_viewable" on public.egg_rate_cards;

create policy "Creators manage own rate cards"
  on public.egg_rate_cards
  for all
  to authenticated
  using (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  );

create policy "Public views active rates on public media kits"
  on public.egg_rate_cards
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.mediakit_is_public = true
        and coalesce(profile.mediakit_access_level, 'public') <> 'private'
    )
  );

