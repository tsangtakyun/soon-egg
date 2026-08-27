update public.egg_profile_blocks as block
set url = 'https://egg.sooncreator.network/' || profile.username || '/mediakit'
from public.egg_creator_profiles as profile
where block.creator_id = profile.id
  and (
    lower(coalesce(block.title, '')) like '%media kit%'
    or lower(coalesce(block.url, '')) = 'https://sooncreator.network/products'
  )
  and block.url is distinct from 'https://egg.sooncreator.network/' || profile.username || '/mediakit';

update public.egg_profile_blocks as block
set url = 'https://egg.sooncreator.network/' || profile.username || '/shop'
from public.egg_creator_profiles as profile
where block.creator_id = profile.id
  and (
    lower(coalesce(block.title, '')) like '%貨品%'
    or lower(coalesce(block.title, '')) like '%shop%'
    or lower(coalesce(block.url, '')) = 'https://sooncreator.network/shop'
  )
  and block.url is distinct from 'https://egg.sooncreator.network/' || profile.username || '/shop';

update public.egg_profile_blocks as block
set url = 'mailto:' || profile.contact_email
from public.egg_creator_profiles as profile
where block.creator_id = profile.id
  and profile.contact_email is not null
  and btrim(profile.contact_email) <> ''
  and (
    lower(coalesce(block.title, '')) like '%合作查詢%'
    or lower(coalesce(block.url, '')) like 'mailto:%'
  )
  and block.url is distinct from 'mailto:' || profile.contact_email;
