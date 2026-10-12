-- Moves a day's plans to another date within its trip. Runs with the caller's own rights, so
-- row-level security still limits it to the caller's trips.
--
-- Returns 'moved', or 'swapped' when the target date had plans and the two days traded dates,
-- or 'occupied' when it had plans and p_swap was false (nothing is changed).
create function public.move_day(p_day uuid, p_date date, p_swap boolean default false)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trip uuid;
  v_old date;
  v_other public.days%rowtype;
  v_other_has_plans boolean;
begin
  select trip_id, date into v_trip, v_old from public.days where id = p_day;
  if not found then
    raise exception 'Day not found';
  end if;
  if v_old = p_date then
    return 'moved';
  end if;

  select * into v_other from public.days where trip_id = v_trip and date = p_date;
  if not found then
    update public.days set date = p_date where id = p_day;
    return 'moved';
  end if;

  v_other_has_plans :=
    v_other.start_place_id is not null
    or v_other.end_place_id is not null
    or exists (select 1 from public.stops where day_id = v_other.id);

  if not v_other_has_plans then
    delete from public.days where id = v_other.id;
    update public.days set date = p_date where id = p_day;
    return 'moved';
  end if;

  if not p_swap then
    return 'occupied';
  end if;

  -- Two days of a trip cannot share a date even for a moment, so park one on a placeholder.
  update public.days set date = '0001-01-01' where id = v_other.id;
  update public.days set date = p_date where id = p_day;
  update public.days set date = v_old where id = v_other.id;
  return 'swapped';
end;
$$;

revoke all on function public.move_day(uuid, date, boolean) from public, anon;
grant execute on function public.move_day(uuid, date, boolean) to authenticated;
