-- Source: original Threads post @minidietitian_foodiary/post/DJwnjVKJGXq.
-- Preserve the existing topic ID, media, geography, bookmarks and ownership.
update public.egg_topic_ideas
set title='巴黎 Cedric Grolet Opéra：層次分明的可頌',
 summary='原帖分享巴黎 Cedric Grolet Opéra 的可頌，重點呈現酥脆外皮、柔軟而層次分明的內層，以及濃郁的牛油風味。',
 category='美食', tags=array['巴黎','法國','Cedric Grolet Opéra','可頌'], updated_at=now()
where id='ec774da6-3cf4-4f43-9f65-ae4c0384a350'
 and title='Threads創作者內容靈感' and updated_at='2026-09-23 10:41:38.973+00'::timestamptz
returning id,title,summary,category;
