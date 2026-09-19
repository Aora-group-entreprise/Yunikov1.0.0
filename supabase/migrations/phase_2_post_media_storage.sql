-- Phase 2: private post-media bucket with signed uploads and visibility-aware reads.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('post-media','post-media',false,52428800,array['image/*','video/*'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['image/*','video/*'];

drop policy if exists post_media_upload on storage.objects;
create policy post_media_upload on storage.objects for insert to authenticated
with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists post_media_owner_read on storage.objects;
create policy post_media_owner_read on storage.objects for select to authenticated
using (bucket_id='post-media' and owner_id=(select auth.uid()::text));

drop policy if exists post_media_visible_read on storage.objects;
create policy post_media_visible_read on storage.objects for select to authenticated
using (bucket_id='post-media' and exists (
  select 1 from public.posts p where p.media_url=storage.objects.name
  and p.deleted_at is null and p.status='ready'
  and (p.visibility='public' or p.author_id=(select auth.uid()) or exists (
    select 1 from public.follows f where f.follower_uuid=(select auth.uid())
    and f.following_uuid=p.author_id and f.status='accepted'
  ))
));

drop policy if exists post_media_owner_delete on storage.objects;
create policy post_media_owner_delete on storage.objects for delete to authenticated
using (bucket_id='post-media' and owner_id=(select auth.uid()::text));
