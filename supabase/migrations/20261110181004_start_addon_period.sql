create function public.start_addon_period(target_addon_id bigint, new_details text, new_start_day date)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.addon_periods
  set end_day = new_start_day - 1
  where addon_id = target_addon_id and end_day is null;

  insert into public.addon_periods (addon_id, details, start_day)
  values (target_addon_id, new_details, new_start_day);
end;
$$;

revoke execute on function public.start_addon_period(bigint, text, date) from public, anon;
