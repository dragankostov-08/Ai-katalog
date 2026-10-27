-- AI KATALOG — Supabase Storage bucket for logos and article images.
-- Public read; only staff can upload, replace or delete files.
-- Skipped automatically when the storage schema is not present (plain Postgres).

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not found; skipping media bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('media', 'media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif'])
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  execute $p$
    create policy media_staff_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and (select public.is_staff()))
  $p$;
  execute $p$
    create policy media_staff_update on storage.objects for update to authenticated
      using (bucket_id = 'media' and (select public.is_staff()))
      with check (bucket_id = 'media' and (select public.is_staff()))
  $p$;
  execute $p$
    create policy media_staff_delete on storage.objects for delete to authenticated
      using (bucket_id = 'media' and (select public.is_staff()))
  $p$;
end;
$$;
