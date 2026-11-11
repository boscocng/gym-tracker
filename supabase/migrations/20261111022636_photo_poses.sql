create type public.photo_pose as enum ('front', 'back');

alter table public.photos add column pose public.photo_pose not null default 'front';
alter table public.photos alter column pose drop default;

alter table public.photos drop constraint photos_pkey;
alter table public.photos add primary key (day, pose);
