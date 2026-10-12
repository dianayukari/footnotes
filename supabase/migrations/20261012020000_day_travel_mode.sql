-- How the traveller gets around on a day: walking only, public transit, or whichever is better
-- per leg.
alter table public.days
  add column travel_mode text not null default 'auto'
  check (travel_mode in ('auto', 'walk', 'transit'));
