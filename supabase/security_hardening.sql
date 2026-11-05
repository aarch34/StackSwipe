-- ==============================================================================
-- StackSwipe security hardening
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Safe to run more than once. Requires schema.sql and admin_migration.sql.
--
-- Deploy the matching app code at the same time. The swipe deck and match list
-- read other users through the user_profiles view created below.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Moderation columns can only be changed by admins
-- ------------------------------------------------------------------------------
create or replace function public.protect_moderation_columns()
returns trigger as $$
begin
  -- No JWT user means the auth signup trigger, the service role or the SQL editor.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.account_status := 'active';
    new.suspended_until := null;
    new.suspension_reason := null;
    new.ban_reason := null;
    new.warning_count := 0;
    return new;
  end if;

  if new.account_status is distinct from old.account_status
    or new.suspended_until is distinct from old.suspended_until
    or new.suspension_reason is distinct from old.suspension_reason
    or new.ban_reason is distinct from old.ban_reason
    or new.warning_count is distinct from old.warning_count
  then
    raise exception 'Moderation fields can only be changed by an admin'
      using errcode = '42501';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists protect_moderation_columns on public.users;
create trigger protect_moderation_columns
  before insert or update on public.users
  for each row execute function public.protect_moderation_columns();

-- True only when the signed-in user's account is in good standing.
create or replace function public.is_account_active()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and coalesce(account_status, 'active') = 'active'
  );
$$ language sql stable security definer set search_path = public;

-- A restricted user could otherwise delete their row and insert a clean one.
drop policy if exists "Users can delete their own profile" on public.users;
create policy "Users can delete their own profile"
on public.users for delete
to authenticated
using (auth.uid() = id and public.is_account_active());

-- ------------------------------------------------------------------------------
-- 2. Restricted accounts cannot swipe, match or message at the database level
-- ------------------------------------------------------------------------------
drop policy if exists "Users can insert their own swipes" on public.swipes;
create policy "Users can insert their own swipes"
on public.swipes for insert
to authenticated
with check (auth.uid() = swiper_id and public.is_account_active());

drop policy if exists "Users can update their own swipes" on public.swipes;
create policy "Users can update their own swipes"
on public.swipes for update
to authenticated
using (auth.uid() = swiper_id)
with check (auth.uid() = swiper_id and public.is_account_active());

-- ------------------------------------------------------------------------------
-- 3. A match needs a real right swipe from both people
-- ------------------------------------------------------------------------------
drop policy if exists "Users can create matches they belong to" on public.matches;
create policy "Users can create matches they belong to"
on public.matches for insert
to authenticated
with check (
  auth.uid() = any(user_ids)
  and cardinality(user_ids) = 2
  and public.is_account_active()
  and exists (
    select 1
    from public.swipes mine
    join public.swipes theirs
      on theirs.swiper_id = mine.swiped_id
     and theirs.swiped_id = mine.swiper_id
    where mine.swiper_id = auth.uid()
      and mine.swiped_id = any(user_ids)
      and mine.direction = 'right'
      and theirs.direction = 'right'
  )
);

drop policy if exists "Users can send messages to their matches" on public.messages;
create policy "Users can send messages to their matches"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_account_active()
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and auth.uid() = any(m.user_ids)
  )
);

-- Editing must not move a message into a conversation the sender is not part of.
drop policy if exists "Senders can edit or delete their own messages" on public.messages;
create policy "Senders can edit or delete their own messages"
on public.messages for update
to authenticated
using (auth.uid() = sender_id)
with check (
  auth.uid() = sender_id
  and public.is_account_active()
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and auth.uid() = any(m.user_ids)
  )
);

-- ------------------------------------------------------------------------------
-- 4. Other people's profiles are read through a view without private columns
-- ------------------------------------------------------------------------------
drop policy if exists "Authenticated users can view profiles" on public.users;

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
on public.users for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Admin can read all users" on public.users;
create policy "Admin can read all users"
on public.users for select
to authenticated
using (public.is_admin());

drop policy if exists "Admin can update any user" on public.users;
create policy "Admin can update any user"
on public.users for update
to authenticated
using (public.is_admin());

-- Runs with the view owner's rights, so it is the one way to read other users.
-- Do not add email, firebase_uid or any moderation column here.
create or replace view public.user_profiles as
select
  id,
  name,
  age,
  gender,
  headline,
  bio,
  job_title,
  company,
  experience_level,
  location,
  photo_url,
  tech_stack,
  interests,
  networking_tags,
  college,
  current_work,
  links,
  onboarding_completed,
  onboarding_step
from public.users;

revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to authenticated;

-- ------------------------------------------------------------------------------
-- 5. Per-user daily AI quota
-- ------------------------------------------------------------------------------
create table if not exists public.ai_daily_usage (
    user_id uuid not null references public.users(id) on delete cascade,
    day date not null,
    kind text not null check (kind in ('chatbot', 'icebreaker', 'reply')),
    count integer not null default 0,
    primary key (user_id, day, kind)
);

-- RLS with no policies: only increment_ai_usage can touch this table.
alter table public.ai_daily_usage enable row level security;
revoke all on public.ai_daily_usage from public, anon, authenticated;

create or replace function public.increment_ai_usage(p_kind text)
returns integer as $$
  insert into public.ai_daily_usage as usage (user_id, day, kind, count)
  values (auth.uid(), (now() at time zone 'utc')::date, p_kind, 1)
  on conflict (user_id, day, kind)
  do update set count = usage.count + 1
  returning count;
$$ language sql security definer set search_path = public;

revoke all on function public.increment_ai_usage(text) from public, anon;
grant execute on function public.increment_ai_usage(text) to authenticated;

-- ------------------------------------------------------------------------------
-- Optional check: existing matches with no mutual right swipe.
-- This only lists them. Review before removing anything.
-- ------------------------------------------------------------------------------
-- select m.id, m.user_ids, m.created_at
-- from public.matches m
-- where not exists (
--   select 1
--   from public.swipes a
--   join public.swipes b on b.swiper_id = a.swiped_id and b.swiped_id = a.swiper_id
--   where a.swiper_id = m.user_ids[1]
--     and a.swiped_id = m.user_ids[2]
--     and a.direction = 'right'
--     and b.direction = 'right'
-- );
