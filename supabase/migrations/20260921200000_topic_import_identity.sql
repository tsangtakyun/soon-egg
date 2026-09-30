begin;
create or replace function public.topic_source_key(url text) returns text language sql immutable strict set search_path=public as $$
 select case
 when url ~ '^https://(www\.)?instagram\.com/(p|reel|reels|tv)/[^/?#]+' then 'instagram:' || substring(url from '^https://(?:www\.)?instagram\.com/(?:p|reel|reels|tv)/([^/?#]+)')
 when url ~ '^https://(www\.|m\.)?youtube\.com/watch\?.*[?&]?v=' then 'youtube:' || substring(url from '[?&]v=([^&#]+)')
 when url ~ '^https://youtu\.be/[^/?#]+' then 'youtube:' || substring(url from '^https://youtu\.be/([^/?#]+)')
 when url ~ '^https://(www\.|m\.)?youtube\.com/(shorts|embed)/[^/?#]+' then 'youtube:' || substring(url from '^https://(?:www\.|m\.)?youtube\.com/(?:shorts|embed)/([^/?#]+)')
 else split_part(trim(url),'#',1) end;
$$;
alter table public.egg_topic_ideas add column if not exists source_key text generated always as (public.topic_source_key(source_url)) stored;
alter table public.egg_topic_ideas add column if not exists import_state text not null default 'ready' check(import_state in ('pending','ready','failed'));
alter table public.egg_topic_ideas add column if not exists import_error text;
alter table public.egg_topic_ideas add column if not exists import_started_at timestamptz;
-- Old unresolved imports become explicitly retryable instead of staying pending forever.
update public.egg_topic_ideas set import_state='failed', import_error='上次整理未完成，請重新匯入同一來源以重試。', tags=array_remove(tags,'AI整理中')
where title='正在整理題材' or tags @> array['AI整理中'];
-- Do not guess lost workspace ownership here. That is repaired separately from verified evidence.
create or replace function public.protect_topic_workspace() returns trigger language plpgsql set search_path=public as $$
begin
 if old.workspace_id is not null and new.workspace_id is null then return old; end if;
 return new;
end $$;
drop trigger if exists protect_topic_workspace on public.egg_topic_ideas;
create trigger protect_topic_workspace before update on public.egg_topic_ideas for each row execute function public.protect_topic_workspace();
commit;
