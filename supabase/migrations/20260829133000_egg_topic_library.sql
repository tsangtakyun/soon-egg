create table if not exists public.egg_topic_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.egg_creator_profiles(id) on delete cascade,
  title text not null,
  summary text,
  source_name text,
  source_url text,
  image_url text,
  platform text not null default 'Instagram',
  category text not null default '其他',
  tags text[] not null default '{}',
  content_format text not null default 'short_video',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.egg_topic_actions (
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  idea_id uuid not null references public.egg_topic_ideas(id) on delete cascade,
  saved boolean not null default false,
  want_to_create boolean not null default false,
  dismissed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, idea_id)
);

create index if not exists egg_topic_ideas_workspace_status_idx
  on public.egg_topic_ideas(workspace_id, status, created_at desc);
create index if not exists egg_topic_actions_workspace_idx
  on public.egg_topic_actions(workspace_id, updated_at desc);

alter table public.egg_topic_ideas enable row level security;
alter table public.egg_topic_actions enable row level security;
revoke all on public.egg_topic_ideas from anon, authenticated;
revoke all on public.egg_topic_actions from anon, authenticated;
grant all on public.egg_topic_ideas to service_role;
grant all on public.egg_topic_actions to service_role;

insert into public.egg_topic_ideas
  (id, title, summary, source_name, source_url, platform, category, tags, content_format)
values
  ('a1000000-0000-4000-8000-000000000001', '阿姆斯特丹「社區警貓」有新搭檔', '住在船屋的黑貓 Nimis 因穿上黃色 POLICE 救生衣巡邏而爆紅，現在更迎來黑貓妹妹 Boef。', 'A Day Magazine', 'https://www.adaymag.com/2026/08/07/police-cat-amsterdam.html', '網頁', 'Trending 最新資訊', array['動物趣聞','阿姆斯特丹','社群熱話'], 'carousel'),
  ('a1000000-0000-4000-8000-000000000002', '睡不着不是不夠累：睡前先讓身體慢慢關機', '可用「睡前關機」切入，解釋越逼自己入睡反而越清醒，再用留言關鍵字提供實用清單。', 'Instagram · @lilia0730000', 'https://www.instagram.com/p/Db8Zw0qE0ay/?img_index=6', 'Instagram', '生活健康', array['睡眠','生活健康','互動貼文'], 'carousel'),
  ('a1000000-0000-4000-8000-000000000003', '每年春天都會消失的瑞典 ICEHOTEL', '瑞典 Jukkasjärvi 的 ICEHOTEL 每年冬天以河冰重建，春天再融回河流，每年由不同藝術家重新設計。', 'Instagram · @junpin_design', 'https://www.instagram.com/p/DbvA-XZkXLX/', 'Instagram', 'Travel 旅遊資訊', array['瑞典','冰旅館','建築設計'], 'short_video'),
  ('a1000000-0000-4000-8000-000000000004', '食物跌落地，三秒內執起真的可以吃嗎？', '研究顯示細菌幾乎即時轉移；食物水分與地面材質往往比「三秒」更關鍵。', 'Instagram · @wisdomkingdom_hk', 'https://www.instagram.com/p/DZ7UdWggTjd/', 'Instagram', 'Trending 最新資訊', array['冷知識','食物科學','三秒定律'], 'short_video')
on conflict (id) do nothing;
