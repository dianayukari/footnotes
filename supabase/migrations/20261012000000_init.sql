-- Footnotes initial schema: profiles with admin approval, trips > days > stops, shared places.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  approved boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every new sign-in gets a pending profile.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Security definer so policies on profiles can call these without recursing into RLS.
create function private.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and approved
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and is_admin
  );
$$;

grant execute on function private.is_approved() to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;

-- Users cannot write their own profile, so they cannot approve themselves.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (approved, is_admin) on public.profiles to authenticated;

create policy "read own profile or all as admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "admin updates approval"
  on public.profiles for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- places: shared across users, keyed by Google place ID
-- ---------------------------------------------------------------------------
create table public.places (
  place_id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  types text[] not null default '{}',
  -- Written only by Edge Functions (service role).
  guide text,
  suggested_minutes integer,
  created_at timestamptz not null default now()
);

alter table public.places enable row level security;

revoke all on public.places from anon, authenticated;
grant select on public.places to authenticated;
grant insert (place_id, name, lat, lng, address, types) on public.places to authenticated;

create policy "approved users read places"
  on public.places for select to authenticated
  using ((select private.is_approved()));

create policy "approved users add places"
  on public.places for insert to authenticated
  with check ((select private.is_approved()));

-- ---------------------------------------------------------------------------
-- trips > days > stops: private to their owner
-- ---------------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index trips_user_id_idx on public.trips (user_id);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  start_time time not null default '09:00',
  -- Optional fixed start and end points, e.g. the hotel.
  start_place_id text references public.places (place_id),
  end_place_id text references public.places (place_id),
  unique (trip_id, date)
);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  place_id text not null references public.places (place_id),
  position integer not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  -- When set, the optimiser must arrive at exactly this local time.
  fixed_arrival time,
  notes text,
  created_at timestamptz not null default now()
);
create index stops_day_id_idx on public.stops (day_id, position);

alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.stops enable row level security;

revoke all on public.trips, public.days, public.stops from anon;
grant select, insert, update, delete on public.trips, public.days, public.stops to authenticated;

create policy "owner manages trips"
  on public.trips for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_approved()))
  with check (user_id = (select auth.uid()) and (select private.is_approved()));

-- The subqueries run under the trips policy, so they only match the caller's own trips.
create policy "owner manages days"
  on public.days for all to authenticated
  using (exists (select 1 from public.trips t where t.id = days.trip_id))
  with check (exists (select 1 from public.trips t where t.id = days.trip_id));

create policy "owner manages stops"
  on public.stops for all to authenticated
  using (exists (select 1 from public.days d where d.id = stops.day_id))
  with check (exists (select 1 from public.days d where d.id = stops.day_id));
