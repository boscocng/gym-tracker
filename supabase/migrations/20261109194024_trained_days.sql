create view public.trained_days with (security_invoker = true) as
select distinct day from public.sets;
