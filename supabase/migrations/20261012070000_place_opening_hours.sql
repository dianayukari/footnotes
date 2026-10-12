-- Regular weekly opening hours from Google, as a list of periods:
--   [{"open": {"day": 0-6, "hour": h, "minute": m}, "close": {...} | null}, ...]
-- Day 0 is Sunday. Null means the hours have not been fetched yet; an empty list means Google
-- lists none (a square, a viewpoint), which the planner treats as always open.
alter table public.places add column opening_hours jsonb;

-- Approved users may fill in the hours of places saved before this column existed. They still
-- cannot change any other column of a shared place.
grant insert (opening_hours), update (opening_hours) on public.places to authenticated;

create policy "approved users fill in opening hours"
  on public.places for update to authenticated
  using ((select private.is_approved()))
  with check ((select private.is_approved()));
