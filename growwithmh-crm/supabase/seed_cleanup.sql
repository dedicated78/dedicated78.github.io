-- Removes everything created by supabase/seed.sql (matches the "(Demo)" suffix on business names).
delete from public.clients where business_name like '%(Demo)';
delete from public.leads   where business_name like '%(Demo)';  -- cascades to reports, activities, deals
