-- How the traveller leaves the day's starting point for the first stop; null lets the app pick.
-- (Legs between stops, and from the last stop to the end point, use stops.travel_mode.)
alter table public.days
  add column start_travel_mode text check (start_travel_mode in ('walk', 'transit'));
