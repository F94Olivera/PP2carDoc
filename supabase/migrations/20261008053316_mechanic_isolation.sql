-- Demo data reset explicitly authorized: only carDoc application tables are recreated.
-- Supabase-managed auth/storage schemas are preserved.
drop table if exists public.work_order_recommendations, public.work_order_items,
  public.work_orders, public.vehicles, public.customers cascade;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role text not null default 'MECHANIC' check (role in ('GOD', 'MECHANIC')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create table public.customers (
  id serial primary key,
  mechanic_id uuid not null references public.user_profiles(id) on delete restrict,
  first_name text not null, last_name text, email text, phone text, address text,
  document_number text, notes text, is_active boolean not null default true,
  created_at timestamp not null default now(), updated_at timestamp not null default now(),
  unique (mechanic_id, document_number)
);
create index customers_mechanic_id_idx on public.customers(mechanic_id);
create table public.vehicles (
  id serial primary key, customer_id integer not null references public.customers(id) on delete restrict,
  license_plate text not null check (length(trim(license_plate)) > 0),
  make text not null, model text not null, year integer check (year is null or year >= 1886),
  initial_odometer integer check (initial_odometer is null or initial_odometer >= 0),
  odometer_unit text not null check (odometer_unit in ('km', 'mi')),
  is_active boolean not null default true, created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index vehicles_customer_id_idx on public.vehicles(customer_id);
create table public.work_orders (
  id serial primary key, vehicle_id integer not null references public.vehicles(id) on delete restrict,
  entry_date timestamp not null, exit_date timestamp,
  intake_odometer integer check (intake_odometer is null or intake_odometer >= 0),
  reported_problem text not null, notes text, diagnosis text,
  created_at timestamp not null default now(), updated_at timestamp not null default now(),
  check (exit_date is null or exit_date >= entry_date)
);
create index work_orders_vehicle_id_idx on public.work_orders(vehicle_id);
create table public.work_order_items (
  id serial primary key, work_order_id integer not null references public.work_orders(id) on delete cascade,
  description text not null, category text not null check (category in ('labor', 'part', 'other')),
  quantity real not null check (quantity > 0), unit_price integer not null check (unit_price >= 0),
  created_at timestamp not null default now(), updated_at timestamp not null default now()
);
create index work_order_items_work_order_id_idx on public.work_order_items(work_order_id);
create table public.work_order_recommendations (
  id serial primary key, work_order_id integer not null references public.work_orders(id) on delete cascade,
  description text not null, reason text,
  status text check (status in ('pending', 'accepted', 'rejected')),
  priority text check (priority in ('low', 'medium', 'high')),
  created_at timestamp not null default now(), updated_at timestamp not null default now()
);
create index work_order_recommendations_work_order_id_idx on public.work_order_recommendations(work_order_id);

-- Private derived index enforces plate uniqueness under concurrency without an owner column in vehicles.
create table private.vehicle_plate_claims (
  vehicle_id integer primary key references public.vehicles(id) on delete cascade,
  mechanic_id uuid not null references public.user_profiles(id) on delete restrict,
  license_plate text not null,
  unique(mechanic_id, license_plate)
);
revoke all on private.vehicle_plate_claims from public, anon, authenticated;
create function private.sync_vehicle_plate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  -- Lock the parent against simultaneous ownership transfers.
  select mechanic_id into strict owner_id from public.customers where id = new.customer_id for share;
  insert into private.vehicle_plate_claims(vehicle_id, mechanic_id, license_plate)
  values(new.id, owner_id, upper(trim(new.license_plate)))
  on conflict(vehicle_id) do update set mechanic_id = excluded.mechanic_id, license_plate = excluded.license_plate;
  return new;
end $$;
create trigger vehicles_plate after insert or update of customer_id, license_plate on public.vehicles
for each row execute function private.sync_vehicle_plate();
create function private.sync_customer_plates() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.mechanic_id is distinct from old.mechanic_id then
    update private.vehicle_plate_claims set mechanic_id = new.mechanic_id
    where vehicle_id in (select id from public.vehicles where customer_id = new.id);
  end if;
  return new;
end $$;
create trigger customers_plates after update of mechanic_id on public.customers
for each row execute function private.sync_customer_plates();

-- Narrow security-definer helpers read protected auth/session/profile data only.
-- They are private, have fixed search paths, and derive identity from auth.uid().
create function private.session_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and coalesce((auth.jwt()->>'exp')::bigint > extract(epoch from now()), false)
    and exists (select 1 from auth.sessions s
      where s.id = nullif(auth.jwt()->>'session_id', '')::uuid and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now()));
$$;
create function private.current_app_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.user_profiles where id = auth.uid() and private.session_active();
$$;
create function private.can_access_mechanic(owner_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.current_app_role() = 'GOD'
    or (private.current_app_role() = 'MECHANIC' and auth.uid() = owner_id);
$$;

-- Profile is authoritative; this nested signed claim is informational and refreshes with the JWT.
create function private.sync_profile_claim() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('user_role', new.role) where id = new.id;
  new.updated_at = now();
  return new;
end $$;
create trigger user_profiles_claim before insert or update of role on public.user_profiles
for each row execute function private.sync_profile_claim();
create function private.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_anonymous then
    insert into public.user_profiles(id) values(new.id) on conflict(id) do nothing;
  end if;
  return new;
end $$;
create trigger cardoc_user_profile after insert on auth.users
for each row execute function private.create_user_profile();
insert into public.user_profiles(id) select id from auth.users where not is_anonymous;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.session_active(), private.current_app_role(),
  private.can_access_mechanic(uuid) to authenticated;
revoke all on public.user_profiles, public.customers, public.vehicles, public.work_orders,
  public.work_order_items, public.work_order_recommendations from anon, authenticated;
grant select on public.user_profiles to authenticated;
grant select, insert, update, delete on public.customers, public.vehicles, public.work_orders,
  public.work_order_items, public.work_order_recommendations to authenticated;
grant usage on sequence public.customers_id_seq, public.vehicles_id_seq, public.work_orders_id_seq,
  public.work_order_items_id_seq, public.work_order_recommendations_id_seq to authenticated;

alter table public.user_profiles enable row level security;
create policy profiles_read on public.user_profiles for select to authenticated
using (private.session_active() and (id = auth.uid() or private.current_app_role() = 'GOD'));
alter table public.customers enable row level security;
create policy customers_access on public.customers for all to authenticated
using (private.can_access_mechanic(mechanic_id)) with check (private.can_access_mechanic(mechanic_id));
alter table public.vehicles enable row level security;
create policy vehicles_access on public.vehicles for all to authenticated
using (exists(select 1 from public.customers c where c.id = customer_id))
with check (exists(select 1 from public.customers c where c.id = customer_id));
alter table public.work_orders enable row level security;
create policy work_orders_access on public.work_orders for all to authenticated
using (exists(select 1 from public.vehicles v where v.id = vehicle_id))
with check (exists(select 1 from public.vehicles v where v.id = vehicle_id));
alter table public.work_order_items enable row level security;
create policy work_order_items_access on public.work_order_items for all to authenticated
using (exists(select 1 from public.work_orders w where w.id = work_order_id))
with check (exists(select 1 from public.work_orders w where w.id = work_order_id));
alter table public.work_order_recommendations enable row level security;
create policy recommendations_access on public.work_order_recommendations for all to authenticated
using (exists(select 1 from public.work_orders w where w.id = work_order_id))
with check (exists(select 1 from public.work_orders w where w.id = work_order_id));
