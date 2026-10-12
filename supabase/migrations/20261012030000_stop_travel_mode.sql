-- The travel mode moves from the day to each leg. A stop's travel_mode is how the traveller
-- leaves it for the next stop; null lets the app pick the better mode.
alter table public.days drop column travel_mode;

alter table public.stops
  add column travel_mode text check (travel_mode in ('walk', 'transit'));
