-- Phase 4: Postgres search vectors/indexes and Realtime publication.
alter table public.profiles add column if not exists search_vector tsvector generated always as (to_tsvector('simple',coalesce(username,'')||' '||coalesce(display_name,'')||' '||coalesce(bio,''))) stored;
alter table public.posts add column if not exists search_vector tsvector generated always as (to_tsvector('simple',coalesce(caption,'')||' '||coalesce(hashtags,''))) stored;
create index if not exists profiles_search_vector_gin on public.profiles using gin(search_vector);
create index if not exists posts_search_vector_gin on public.posts using gin(search_vector);
create or replace function public.search_yuniko(q text)
returns table(kind text,id text,title text,subtitle text,avatar_url text,created_at timestamptz)
language sql stable security invoker as $$
 (select 'user',u.id::text,u.display_name,u.username,u.avatar_url,u.created_at::timestamptz from public.users u where length(trim(q))>=2 and (u.username ilike '%'||trim(q)||'%' or u.display_name ilike '%'||trim(q)||'%') order by u.username limit 20)
 union all
 (select 'post',p.id::text,left(p.caption,120),u.username,u.avatar_url,p.created_at::timestamptz from public.posts p join public.users u on u.id=p.user_id where p.deleted_at is null and length(trim(q))>=2 and (p.caption ilike '%'||trim(q)||'%' or p.hashtags ilike '%'||trim(q)||'%') order by p.created_at desc limit 30)
$$;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.post_engagements;
alter publication supabase_realtime add table public.comments;