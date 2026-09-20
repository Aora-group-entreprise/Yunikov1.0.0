-- Yuniko finalization batch: feed + global distribution hardening.
-- Authentication intentionally remains Supabase email/password as currently implemented.
-- Google OAuth, Apple OAuth, and any replacement auth provider are intentionally excluded.

create or replace function private.get_ranked_feed(p_user uuid, p_country text default null, p_limit integer default 20)
returns table(id integer,user_id integer,author_id uuid,caption text,media_url text,media_type text,location text,hashtags text,visibility text,status text,likes integer,comments integer,shares integer,saves integer,views integer,created_at timestamp without time zone,deleted_at timestamptz,author jsonb,feed_score numeric)
language sql stable security definer set search_path=''
as $$
with me as (
 select u.id legacy_id from public.users u where u.auth_user_id=(select auth.uid()) and u.auth_user_id=p_user limit 1
), base as (
 select p.*,coalesce(ps.impressions,0)::numeric impressions,coalesce(ps.likes,0)::numeric stat_likes,coalesce(ps.comments,0)::numeric stat_comments,coalesce(ps.saves,0)::numeric stat_saves,coalesce(ps.shares,0)::numeric stat_shares,coalesce(ps.completion_rate,0)::numeric completion_rate,coalesce(ps.score,0)::numeric base_score,coalesce(pd.countries,'{}'::text[]) dist_countries,coalesce(pd.stage,1) dist_stage,greatest(extract(epoch from(now()-p.created_at))/3600.0,0.5) age_h,
 case when exists(select 1 from public.follows f where f.follower_uuid=p_user and f.following_uuid=p.author_id and f.status='accepted') then 1 else 0 end following,
 coalesce((select ua.score from public.user_affinity ua,me where ua.user_id=me.legacy_id and ua.target_user_id=p.user_id),0)::numeric affinity,
 coalesce((select sum(uta.score) from public.user_topic_affinity uta,me where uta.user_id=me.legacy_id and lower(uta.topic)=any(regexp_split_to_array(lower(replace(coalesce(p.hashtags,''),'#','')),'[, ]+'))),0)::numeric topic_score,
 coalesce((select sum(abs(e.weight)) from public.events e where e.user_id=p_user and e.post_id=p.id and e.type in('hide','report','not_interested','quick_scroll') and e.created_at>now()-interval '30 days'),0)::numeric negative_raw
 from public.posts p left join public.post_stats ps on ps.post_id=p.id left join public.post_distribution pd on pd.post_id=p.id
 where p.status='ready' and p.deleted_at is null
 and not exists(select 1 from public.seen_posts sp where sp.user_id=p_user and sp.post_id=p.id and sp.seen_at>now()-interval '7 days')
 and not exists(select 1 from public.blocked_users b,me where(b.blocker_id=me.legacy_id and b.blocked_id=p.user_id)or(b.blocker_id=p.user_id and b.blocked_id=me.legacy_id))
 and(p.visibility='public' or p.author_id=p_user or exists(select 1 from public.follows f where f.follower_uuid=p_user and f.following_uuid=p.author_id and f.status='accepted'))
 and(p_country is null or p.author_id=p_user or p.is_world_feed or p_country=any(pd.countries) or coalesce(pd.stage,1)=1)
), bucketed as (
 select b.*,case when b.following=1 then 'following' when b.affinity>.05 then 'affinity' when b.topic_score>.05 then 'topic' when p_country is not null and(p_country=any(b.dist_countries) or b.base_score>.05) then 'localTrending' else 'exploration' end bucket from base b limit 2000
), signals as (
 select b.*,least(1,(b.stat_likes+3*b.stat_comments+4*b.stat_saves+5*b.stat_shares)/greatest(b.impressions,1)) engagement_raw,
 least(1,((b.stat_likes+3*b.stat_comments+4*b.stat_saves+5*b.stat_shares)/greatest(b.impressions,1))/greatest(b.age_h,.5)) velocity_raw,
 exp(-b.age_h*ln(2)/12.0) freshness_raw,least(1,greatest(0,.5*b.affinity+.3*b.following+.2*least(1,b.topic_score))) relevance_raw,
 least(1,greatest(0,b.topic_score)) personalization_raw,greatest(0,least(1,.45+.35*b.completion_rate+.20*least(1,b.base_score))) quality_raw,least(.9,b.negative_raw/10.0) negative
 from bucketed b
), percentile_values as (
 select greatest(percentile_cont(.90) within group(order by engagement_raw),.000001) p90e,greatest(percentile_cont(.90) within group(order by velocity_raw),.000001) p90v from signals
), light as (
 select s.*,pv.p90e,pv.p90v,(.30*least(1,s.engagement_raw/pv.p90e)+.20*least(1,s.velocity_raw/pv.p90v)+.15*s.freshness_raw+.20*s.relevance_raw+.10*s.personalization_raw+.05*s.quality_raw)*(1-s.negative) light_score
 from signals s cross join percentile_values pv
), light200 as (
 select * from(select l.*,row_number() over(order by l.light_score desc,l.created_at desc) rn from light l) x where rn<=200
), heavy as (
 select l.*,(l.light_score*case when l.impressions<200 and l.engagement_raw>(select coalesce(percentile_cont(.5) within group(order by x.engagement_raw),0) from light200 x) then 1.15 else 1 end) heavy_score from light200 l
), ranked as (
 select h.*,row_number() over(partition by h.user_id order by h.heavy_score desc,h.created_at desc) author_slot,
 row_number() over(partition by coalesce(nullif((select country from public.profiles where id=h.author_id),''),'ZZ') order by h.heavy_score desc,h.created_at desc) source_country_slot,
 row_number() over(partition by h.bucket order by h.heavy_score desc,h.created_at desc) bucket_slot
 from heavy h
), eligible as (
 select r.*,case r.bucket when'following' then .40 when'affinity' then .15 when'topic' then .20 when'localTrending' then .15 else .10 end bucket_quota from ranked r
 where r.author_slot<=2 and r.source_country_slot<=greatest(1,ceil(greatest(p_limit,1)*.20))
), selected as (
 select e.*,row_number() over(partition by e.bucket order by e.heavy_score desc,e.created_at desc) bucket_rank from eligible e
), final_rows as (
 select s.*,row_number() over(order by s.heavy_score desc,s.created_at desc) final_rank from selected s
 where s.bucket_rank<=greatest(1,ceil(greatest(p_limit,1)*s.bucket_quota))
)
select f.id,f.user_id,f.author_id,f.caption,f.media_url,f.media_type,f.location,f.hashtags,f.visibility,f.status,f.likes,f.comments,f.shares,f.saves,f.views,f.created_at,f.deleted_at,
jsonb_build_object('id',pr.id,'username',pr.username,'display_name',pr.display_name,'avatar_url',pr.avatar_url,'is_private',pr.is_private) author,f.heavy_score feed_score
from final_rows f join public.profiles pr on pr.id=f.author_id
where f.final_rank<=greatest(1,least(p_limit,50)) order by f.heavy_score desc,f.created_at desc;
$$;

create or replace function private.evaluate_post_distribution()
returns void language plpgsql security definer set search_path=''
as $$
declare r record; new_stage int; er numeric; vel numeric; age_h numeric; countries text[]; author_country text; author_lang text;
begin
 for r in select p.id,p.author_id,p.created_at,coalesce(ps.impressions,0)::numeric impressions,coalesce(ps.likes,0)::numeric likes,coalesce(ps.comments,0)::numeric comments,coalesce(ps.saves,0)::numeric saves,coalesce(ps.shares,0)::numeric shares from public.posts p left join public.post_stats ps on ps.post_id=p.id where p.deleted_at is null and p.status='ready' and p.created_at>now()-interval '7 days' loop
  er:=(r.likes+3*r.comments+4*r.saves+5*r.shares)/greatest(r.impressions,1); age_h:=greatest(extract(epoch from(now()-r.created_at))/3600.0,.5); vel:=er/age_h;
  select country_code,language_code into author_country,author_lang from public.profiles where id=r.author_id;
  if r.impressions>=8000 and er>=.04 and vel>=.02 then new_stage:=4; elsif r.impressions>=3500 and er>=.05 and vel>=.03 then new_stage:=3; elsif r.impressions>=2300 and er>=.06 and vel>=.04 then new_stage:=2; else new_stage:=1; end if;
  select array_agg(country_code order by score desc) into countries from(
    select pr.country_code,
      .40*least(1,ln(1+count(distinct f.follower_uuid))/ln(1001))+
      .25*case when pr.language_code=author_lang then 1 else 0 end+
      .20*least(1,coalesce((select count(*)::numeric from public.events e join public.profiles ep on ep.id=e.user_id where e.post_id=r.id and ep.country_code=pr.country_code and e.type in('like','comment','save','share')),0)/greatest(r.impressions,1))+
      .15*least(1,coalesce((select count(*)::numeric from public.events e join public.profiles ep on ep.id=e.user_id where ep.country_code=pr.country_code and e.type in('like','comment','save','share') and e.created_at>now()-interval '30 days'),0)/100.0) score
    from public.profiles pr left join public.follows f on f.following_uuid=pr.id and f.status='accepted'
    where pr.country_code is not null group by pr.country_code,pr.language_code order by score desc
    limit case when new_stage=1 then 3 when new_stage=2 then 5 when new_stage=3 then 7 else 50 end
  ) ranked;
  countries:=array_cat(case when author_country is null then '{}'::text[] else array[author_country] end,coalesce(countries,'{}'::text[]));
  insert into public.post_distribution(post_id,stage,countries,last_eval_at,impressions_at_stage,engagement_rate,velocity,status)
  values(r.id,new_stage,countries,now(),r.impressions,er,vel,case when new_stage=4 then'worldwide' when age_h>case new_stage when 1 then 6 when 2 then 12 else 24 end then'paused' else'active' end)
  on conflict(post_id) do update set stage=excluded.stage,countries=excluded.countries,last_eval_at=excluded.last_eval_at,
  impressions_at_stage=case when public.post_distribution.stage=excluded.stage then public.post_distribution.impressions_at_stage else excluded.impressions_at_stage end,
  engagement_rate=excluded.engagement_rate,velocity=excluded.velocity,status=excluded.status;
 end loop;
end;
$$;

revoke execute on function private.get_ranked_feed(uuid,text,integer) from public,anon,authenticated;
revoke execute on function private.evaluate_post_distribution() from public,anon,authenticated;
