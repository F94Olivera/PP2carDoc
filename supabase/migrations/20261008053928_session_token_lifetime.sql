-- Enforce the same 15-minute maximum for API and direct Data API access,
-- even if the hosted Auth JWT expiry has not yet been shortened.
create or replace function private.session_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and coalesce((auth.jwt()->>'exp')::bigint > extract(epoch from now()), false)
    and coalesce((auth.jwt()->>'iat')::bigint + 900 > extract(epoch from now()), false)
    and coalesce((auth.jwt()->>'iat')::bigint <= extract(epoch from now()) + 30, false)
    and exists (select 1 from auth.sessions s
      where s.id = nullif(auth.jwt()->>'session_id', '')::uuid and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now()));
$$;
-- Only GOD can administratively change roles; immutable profile identity and timestamps are not writable.
grant update(role) on public.user_profiles to authenticated;
create policy profiles_update on public.user_profiles for update to authenticated
using (private.current_app_role() = 'GOD')
with check (private.current_app_role() = 'GOD');
