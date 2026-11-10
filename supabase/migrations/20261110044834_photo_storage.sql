insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg']);

create policy photos_owner_only on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (select private.is_owner()))
  with check (bucket_id = 'photos' and (select private.is_owner()));
