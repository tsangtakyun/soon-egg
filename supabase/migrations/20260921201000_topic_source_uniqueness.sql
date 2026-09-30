begin;
create temporary table topic_duplicate_map on commit drop as
select id, first_value(id) over(partition by workspace_id,source_key order by (import_state='ready') desc,created_at,id) as keeper
from public.egg_topic_ideas where workspace_id is not null and source_key is not null and status <> 'archived';
insert into public.egg_topic_actions(workspace_id,idea_id,saved,want_to_create,dismissed,updated_at)
select a.workspace_id,m.keeper,bool_or(a.saved),bool_or(a.want_to_create),bool_and(a.dismissed),now()
from public.egg_topic_actions a join topic_duplicate_map m on m.id=a.idea_id group by a.workspace_id,m.keeper
on conflict(workspace_id,idea_id) do update set saved=excluded.saved,want_to_create=excluded.want_to_create,dismissed=excluded.dismissed;
update public.egg_topic_ideas set status='archived' where id in(select id from topic_duplicate_map where id<>keeper);
create unique index if not exists egg_topic_workspace_source_active_unique on public.egg_topic_ideas(workspace_id,source_key) where workspace_id is not null and source_key is not null and status <> 'archived';
commit;