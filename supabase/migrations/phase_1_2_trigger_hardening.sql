-- Phase 1-2 trigger hardening. Trigger functions that cross RLS boundaries live in private.
drop function if exists public.sync_profile_counts() cascade;
drop function if exists public.sync_post_count() cascade;
alter function public.handle_auth_profile() set search_path='';
