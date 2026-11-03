-- Apply separately to an existing project; do not run the destructive demo schema.
create or replace function private.guard_customer_credentials() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.raw_app_meta_data->>'user_role' = 'USER' then
    if new.email is distinct from old.email or coalesce(new.email_change, '') <> '' then
      raise exception 'Customer email is immutable' using errcode = '42501';
    end if;
    if new.encrypted_password is distinct from old.encrypted_password and not (
      current_user = 'supabase_auth_admin' or (current_user = 'postgres' and coalesce(current_setting('cardoc.password_reset', true), '') = 'allowed')
    ) then
      raise exception 'Password changes require Supabase Auth or the owning mechanic' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
