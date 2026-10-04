-- The three team accounts every scenario starts from. Nobody is promoted automatically (README §7.1):
-- the initial admin is assigned explicitly, then roles are set the way an admin would in Settings.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'mehedi@demo.test',  '{"full_name":"Mehedi"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'majeda@demo.test',  '{"full_name":"Majeda"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'mostafa@demo.test', '{"full_name":"Mostafa"}');
update public.profiles set role = 'admin',                is_active = true where email = 'mehedi@demo.test';
update public.profiles set role = 'outreach',             is_active = true where email = 'majeda@demo.test';
update public.profiles set role = 'business_development', is_active = true where email = 'mostafa@demo.test';
