create function public.merge_exercises(source_id bigint, target_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) <> 2 or count(distinct is_bodyweight) <> 1
    from public.exercises
    where id in (source_id, target_id)
  ) then
    raise exception 'merge_exercises needs two different exercises of the same kind';
  end if;

  update public.sets set exercise_id = target_id where exercise_id = source_id;
  update public.exercise_aliases set exercise_id = target_id where exercise_id = source_id;
  delete from public.exercises where id = source_id;
end;
$$;

revoke execute on function public.merge_exercises(bigint, bigint) from public, anon;
