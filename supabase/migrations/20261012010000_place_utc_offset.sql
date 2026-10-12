-- The place's offset from UTC, so transit is queried at the local time of the visit rather than
-- the browser's. Null for places added before this column existed.
alter table public.places add column utc_offset_minutes integer;

grant insert (utc_offset_minutes) on public.places to authenticated;
