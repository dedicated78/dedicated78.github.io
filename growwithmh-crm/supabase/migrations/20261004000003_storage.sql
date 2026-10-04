-- GrowwithMH CRM — 3/4 storage
-- Private bucket for the original Markdown prospect reports.
-- Object path convention: {lead_id}/{version}-{filename}.md

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prospect-reports', 'prospect-reports', false, 2097152, array['text/markdown', 'text/plain'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read: admin, or whoever can open the lead the file belongs to.
create policy "prospect reports: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'prospect-reports' and (public.is_admin() or public.can_access_report_path(name)));

-- Write: admin only. Files are never overwritten (new versions get new paths); no delete policy for others.
create policy "prospect reports: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prospect-reports' and public.is_admin());

create policy "prospect reports: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'prospect-reports' and public.is_admin())
  with check (bucket_id = 'prospect-reports' and public.is_admin());

create policy "prospect reports: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'prospect-reports' and public.is_admin());
