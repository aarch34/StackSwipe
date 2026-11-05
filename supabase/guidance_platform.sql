-- ==============================================================================
-- StackSwipe guidance platform
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Safe to run more than once. Run security_hardening.sql first.
--
-- Run this BEFORE deploying the matching app code. Everything here is additive,
-- so the currently deployed app keeps working once it has been applied.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Optional profile fields. Existing users keep all their data.
-- ------------------------------------------------------------------------------
alter table public.users add column if not exists can_help_with text[] default '{}';
alter table public.users add column if not exists currently_learning text[] default '{}';
alter table public.users add column if not exists guidance_wanted text[] default '{}';
alter table public.users add column if not exists conversation_preferences text[] default '{}';
alter table public.users add column if not exists industry text;

-- New columns can only be added at the end of an existing view.
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
  onboarding_step,
  can_help_with,
  currently_learning,
  guidance_wanted,
  conversation_preferences,
  industry
from public.users;

revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to authenticated;

-- ------------------------------------------------------------------------------
-- 2. Blocking and unmatching
-- Ended matches stay in the table so moderators can still review reported chats,
-- but they and their messages disappear for both people.
-- ------------------------------------------------------------------------------
alter table public.matches add column if not exists ended_at timestamptz;
alter table public.matches add column if not exists ended_by uuid references public.users(id) on delete set null;

create table if not exists public.user_blocks (
    blocker_id uuid not null references public.users(id) on delete cascade,
    blocked_id uuid not null references public.users(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (blocker_id, blocked_id),
    check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon;
grant select on public.user_blocks to authenticated;

drop policy if exists "Users can see who they blocked" on public.user_blocks;
create policy "Users can see who they blocked"
on public.user_blocks for select
to authenticated
using (auth.uid() = blocker_id);

-- Ends a match and records a left swipe. A match needs a right swipe from both
-- people, so this alone stops a blocked or unmatched person re-creating it.
create or replace function public.end_match_with(p_user uuid)
returns void as $$
begin
  update public.matches
  set ended_at = now(), ended_by = auth.uid()
  where ended_at is null
    and auth.uid() = any(user_ids)
    and p_user = any(user_ids);

  insert into public.swipes (swiper_id, swiped_id, direction)
  values (auth.uid(), p_user, 'left')
  on conflict (swiper_id, swiped_id) do update set direction = 'left';
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.end_match_with(uuid) from public, anon, authenticated;

create or replace function public.unmatch_user(p_user uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  perform public.end_match_with(p_user);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.block_user(p_user uuid)
returns void as $$
begin
  if auth.uid() is null or auth.uid() = p_user then
    raise exception 'Invalid block request' using errcode = '42501';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id)
  values (auth.uid(), p_user)
  on conflict do nothing;
  perform public.end_match_with(p_user);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.unblock_user(p_user uuid)
returns void as $$
  delete from public.user_blocks
  where blocker_id = auth.uid() and blocked_id = p_user;
$$ language sql security definer set search_path = public;

revoke all on function public.unmatch_user(uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unmatch_user(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- Hard deletes would erase chats that moderators may need. Unmatching replaces this.
drop policy if exists "Users can delete matches they belong to" on public.matches;

drop policy if exists "Users can view matches they belong to" on public.matches;
create policy "Users can view matches they belong to"
on public.matches for select
to authenticated
using (auth.uid() = any(user_ids) and ended_at is null);

-- Moderators must keep access to ended chats, so these cannot rely on admin_rls_fix.sql.
drop policy if exists "Admin can read all matches" on public.matches;
create policy "Admin can read all matches"
on public.matches for select
to authenticated
using (public.is_admin());

drop policy if exists "Admin can read all messages" on public.messages;
create policy "Admin can read all messages"
on public.messages for select
to authenticated
using (public.is_admin());

drop policy if exists "Users can create matches they belong to" on public.matches;
create policy "Users can create matches they belong to"
on public.matches for insert
to authenticated
with check (
  auth.uid() = any(user_ids)
  and cardinality(user_ids) = 2
  and ended_at is null
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

drop policy if exists "Users can view messages in their matches" on public.messages;
create policy "Users can view messages in their matches"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and auth.uid() = any(m.user_ids)
      and m.ended_at is null
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
      and m.ended_at is null
  )
);

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
      and m.ended_at is null
  )
);

-- ------------------------------------------------------------------------------
-- 3. The swipe deck: only people the signed-in user can actually meet
-- ------------------------------------------------------------------------------
create or replace view public.discoverable_profiles as
select p.*
from public.user_profiles p
join public.users u on u.id = p.id
where u.id <> auth.uid()
  and coalesce(u.account_status, 'active') = 'active'
  and u.onboarding_completed = true
  and not exists (
    select 1 from public.swipes s
    where s.swiper_id = auth.uid() and s.swiped_id = u.id
  )
  and not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = u.id)
       or (b.blocker_id = u.id and b.blocked_id = auth.uid())
  )
order by u.last_active_at desc nulls last;

revoke all on public.discoverable_profiles from public, anon, authenticated;
grant select on public.discoverable_profiles to authenticated;

-- ------------------------------------------------------------------------------
-- 4. Read receipts
-- The update policy only covers senders, so recipients mark messages through this.
-- ------------------------------------------------------------------------------
create or replace function public.mark_messages_read(p_match_ids uuid[])
returns void as $$
  update public.messages msg
  set read = true
  where msg.match_id = any(p_match_ids)
    and msg.read is not true
    and msg.sender_id <> auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = msg.match_id
        and auth.uid() = any(m.user_ids)
        and m.ended_at is null
    );
$$ language sql security definer set search_path = public;

revoke all on function public.mark_messages_read(uuid[]) from public, anon;
grant execute on function public.mark_messages_read(uuid[]) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. Message rate limit (spam protection, not a paywall)
-- ------------------------------------------------------------------------------
create or replace function public.limit_message_rate()
returns trigger as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.messages
    where sender_id = new.sender_id
      and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'You are sending messages too quickly. Please wait a moment.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists limit_message_rate on public.messages;
create trigger limit_message_rate
  before insert on public.messages
  for each row execute function public.limit_message_rate();

-- ------------------------------------------------------------------------------
-- 6. Mission metrics for admins. Returns totals only, never individual users.
-- ------------------------------------------------------------------------------
create or replace function public.lower_topics(p_topics text[])
returns text[] as $$
  select coalesce(array_agg(lower(trim(t))), '{}') from unnest(p_topics) as t;
$$ language sql immutable;

create or replace function public.admin_mission_metrics()
returns jsonb as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  with
  profile_stats as (
    select
      count(*) as registered_users,
      count(*) filter (where onboarding_completed) as completed_profiles,
      count(*) filter (
        where coalesce(cardinality(can_help_with), 0) > 0
           or 'Open to helping beginners' = any(coalesce(conversation_preferences, '{}'))
      ) as willing_to_help,
      count(*) filter (
        where coalesce(cardinality(guidance_wanted), 0) > 0
           or 'Looking for guidance' = any(coalesce(conversation_preferences, '{}'))
      ) as seeking_guidance,
      count(*) filter (
        where coalesce(cardinality(can_help_with), 0) > 0
          and (coalesce(cardinality(guidance_wanted), 0) > 0
               or coalesce(cardinality(currently_learning), 0) > 0)
      ) as learning_and_helping,
      count(*) filter (where created_at < now() - interval '7 days') as eligible_for_retention,
      count(*) filter (
        where created_at < now() - interval '7 days'
          and last_active_at >= created_at + interval '7 days'
      ) as retained_users
    from public.users
  ),
  conversation_stats as (
    select
      m.id,
      count(msg.id) as message_count,
      count(distinct msg.sender_id) as sender_count,
      count(distinct (msg.created_at at time zone 'utc')::date) as active_days
    from public.matches m
    left join public.messages msg on msg.match_id = m.id
    group by m.id
  ),
  match_pairs as (
    select
      public.lower_topics(a.currently_learning) as a_learning,
      public.lower_topics(b.currently_learning) as b_learning,
      public.lower_topics(a.can_help_with) as a_help,
      public.lower_topics(b.can_help_with) as b_help,
      public.lower_topics(coalesce(a.guidance_wanted, '{}') || coalesce(a.currently_learning, '{}')) as a_wants,
      public.lower_topics(coalesce(b.guidance_wanted, '{}') || coalesce(b.currently_learning, '{}')) as b_wants
    from public.matches m
    join public.users a on a.id = m.user_ids[1]
    join public.users b on b.id = m.user_ids[2]
  )
  select jsonb_build_object(
    'registeredUsers', (select registered_users from profile_stats),
    'completedProfiles', (select completed_profiles from profile_stats),
    'willingToHelp', (select willing_to_help from profile_stats),
    'seekingGuidance', (select seeking_guidance from profile_stats),
    'learningAndHelping', (select learning_and_helping from profile_stats),
    'eligibleForRetention', (select eligible_for_retention from profile_stats),
    'retainedUsers', (select retained_users from profile_stats),
    'totalSwipes', (select count(*) from public.swipes),
    'totalMatches', (select count(*) from conversation_stats),
    'conversationsStarted', (select count(*) from conversation_stats where message_count > 0),
    'conversationsWithReplies', (select count(*) from conversation_stats where sender_count >= 2),
    'repeatConversations', (select count(*) from conversation_stats where sender_count >= 2 and active_days >= 2),
    'icebreakerUses', (select coalesce(sum(count), 0) from public.ai_daily_usage where kind = 'icebreaker'),
    'sharedLearningMatches', (select count(*) from match_pairs where a_learning && b_learning),
    'helpMatches', (select count(*) from match_pairs where a_help && b_wants or b_help && a_wants)
  ) into result;

  return result;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function public.admin_mission_metrics() from public, anon;
grant execute on function public.admin_mission_metrics() to authenticated;
