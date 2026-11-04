-- Grants the StackSwipe admins full access to admin data.
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
--
-- Each person must already have an account (signed up and email confirmed).
-- Anyone without one is skipped, so re-run this after they sign up.

insert into public.admin_users (id, email, name, role, is_active)
select
  u.id,
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Super Admin'),
  'super_admin',
  true
from auth.users u
where lower(u.email) in ('aarchaullasan@gmail.com', 'thejaswinps@gmail.com')
on conflict (id) do update
  set role = 'super_admin',
      is_active = true,
      updated_at = now();

-- Shows who has access now. Expect one row per person listed above.
select email, role, is_active
from public.admin_users
where lower(email) in ('aarchaullasan@gmail.com', 'thejaswinps@gmail.com');
