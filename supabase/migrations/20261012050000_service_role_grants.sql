-- The place-info Edge Function runs as service_role. This project does not grant that role table
-- access by default, so give it exactly what the function needs: read the caller's approval,
-- and read and fill in a place's guide notes.
grant select on public.profiles to service_role;
grant select, update on public.places to service_role;
