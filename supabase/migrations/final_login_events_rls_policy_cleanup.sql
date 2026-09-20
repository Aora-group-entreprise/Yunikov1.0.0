-- Remove superseded duplicate login_events policies.
-- Keeps the hardened self-scoped policies created during security hardening.
drop policy if exists login_events_insert_self on yunikov_v1.login_events;
drop policy if exists login_events_select_self on yunikov_v1.login_events;
