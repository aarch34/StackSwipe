-- ==============================================================================
-- StackSwipe Complete Production Database Schema & Row Level Security (RLS)
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. Clean/Drop Existing Policies (Idempotent safe setup)
-- ==============================================================================
-- This allows running the script multiple times without duplicate policy errors.

-- ==============================================================================
-- 3. Table: users
-- ==============================================================================
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    firebase_uid text,
    email text,
    name text,
    age integer check (age >= 18 and age <= 100),
    gender text,
    headline text,
    bio text,
    job_title text,
    company text,
    experience_level text check (experience_level in ('Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager', '') or experience_level is null),
    location text,
    photo_url text,
    tech_stack text[] default '{}',
    interests text[] default '{}',
    networking_tags text[] default '{}',
    college text,
    current_work text,
    links jsonb default '{"github": "", "linkedin": ""}'::jsonb,
    onboarding_completed boolean default false,
    onboarding_step integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Ensure all columns exist even if table was previously created with older schema
alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists age integer;
alter table public.users add column if not exists gender text;
alter table public.users add column if not exists headline text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists job_title text;
alter table public.users add column if not exists company text;
alter table public.users add column if not exists experience_level text;
alter table public.users add column if not exists location text;
alter table public.users add column if not exists photo_url text;
alter table public.users add column if not exists tech_stack text[] default '{}';
alter table public.users add column if not exists interests text[] default '{}';
alter table public.users add column if not exists networking_tags text[] default '{}';
alter table public.users add column if not exists college text;
alter table public.users add column if not exists current_work text;
alter table public.users add column if not exists links jsonb default '{"github": "", "linkedin": ""}'::jsonb;
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists onboarding_step integer default 0;
alter table public.users add column if not exists updated_at timestamptz default now();

-- Indexes for users
create index if not exists idx_users_firebase_uid on public.users(firebase_uid);
create index if not exists idx_users_onboarding on public.users(onboarding_completed);

-- Enable RLS
alter table public.users enable row level security;

-- Policies for users
drop policy if exists "Authenticated users can view profiles" on public.users;
create policy "Authenticated users can view profiles"
on public.users for select
to authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
on public.users for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.users;
create policy "Users can delete their own profile"
on public.users for delete
to authenticated
using (auth.uid() = id);


-- ==============================================================================
-- 4. Automatic User Creation Trigger (from Supabase Auth)
-- ==============================================================================
-- When a user registers via email, Google OAuth, or GitHub OAuth, automatically
-- create their initial profile row in public.users.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id,
    firebase_uid,
    email,
    name,
    photo_url,
    onboarding_completed,
    onboarding_step
  )
  values (
    new.id,
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    false,
    0
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.users.name, excluded.name),
    photo_url = coalesce(public.users.photo_url, excluded.photo_url);

  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger cleanly
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==============================================================================
-- 5. Table: swipes
-- ==============================================================================
create table if not exists public.swipes (
    id uuid primary key default gen_random_uuid(),
    swiper_id uuid not null references public.users(id) on delete cascade,
    swiped_id uuid not null references public.users(id) on delete cascade,
    direction text not null check (direction in ('left', 'right', 'superlike')),
    created_at timestamptz default now(),
    constraint unique_swipe unique(swiper_id, swiped_id)
);

-- Indexes for swipes
create index if not exists idx_swipes_swiper_id on public.swipes(swiper_id);
create index if not exists idx_swipes_swiped_id on public.swipes(swiped_id);
create index if not exists idx_swipes_mutual on public.swipes(swiper_id, swiped_id, direction);

-- Enable RLS
alter table public.swipes enable row level security;

-- Policies for swipes
drop policy if exists "Users can view their own swipes and mutual likes" on public.swipes;
create policy "Users can view their own swipes and mutual likes"
on public.swipes for select
to authenticated
using (
  auth.uid() = swiper_id
  or (auth.uid() = swiped_id and direction = 'right')
);

drop policy if exists "Users can insert their own swipes" on public.swipes;
create policy "Users can insert their own swipes"
on public.swipes for insert
to authenticated
with check (auth.uid() = swiper_id);

drop policy if exists "Users can update their own swipes" on public.swipes;
create policy "Users can update their own swipes"
on public.swipes for update
to authenticated
using (auth.uid() = swiper_id)
with check (auth.uid() = swiper_id);

drop policy if exists "Users can delete their own swipes" on public.swipes;
create policy "Users can delete their own swipes"
on public.swipes for delete
to authenticated
using (auth.uid() = swiper_id);

-- Automatic Mutual Swipe & Match Trigger
create or replace function public.handle_mutual_swipe()
returns trigger as $$
declare
  reciprocal_exists boolean;
  match_already_exists boolean;
begin
  -- Only trigger on right (like) swipes
  if new.direction = 'right' then
    -- Check if other user already swiped right on this swiper
    select exists (
      select 1 from public.swipes
      where swiper_id = new.swiped_id
        and swiped_id = new.swiper_id
        and direction = 'right'
    ) into reciprocal_exists;

    if reciprocal_exists then
      -- Check if match entry already exists
      select exists (
        select 1 from public.matches
        where new.swiper_id = any(user_ids)
          and new.swiped_id = any(user_ids)
      ) into match_already_exists;

      if not match_already_exists then
        insert into public.matches (user_ids)
        values (array[new.swiper_id, new.swiped_id]);
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_swipe_created_check_match on public.swipes;
create trigger on_swipe_created_check_match
  after insert or update on public.swipes
  for each row execute function public.handle_mutual_swipe();



-- ==============================================================================
-- 6. Table: matches
-- ==============================================================================
create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    user_ids uuid[] not null,
    created_at timestamptz default now()
);

-- Fast GIN array index for `contains('user_ids', [currentUser.id])` queries
create index if not exists idx_matches_user_ids on public.matches using gin (user_ids);

-- Enable RLS
alter table public.matches enable row level security;

-- Policies for matches
drop policy if exists "Users can view matches they belong to" on public.matches;
create policy "Users can view matches they belong to"
on public.matches for select
to authenticated
using (auth.uid() = any(user_ids));

drop policy if exists "Users can create matches they belong to" on public.matches;
create policy "Users can create matches they belong to"
on public.matches for insert
to authenticated
with check (auth.uid() = any(user_ids));

drop policy if exists "Users can delete matches they belong to" on public.matches;
create policy "Users can delete matches they belong to"
on public.matches for delete
to authenticated
using (auth.uid() = any(user_ids));


-- ==============================================================================
-- 7. Table: messages
-- ==============================================================================
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null references public.matches(id) on delete cascade,
    sender_id uuid not null references public.users(id) on delete cascade,
    text text default '',
    image_url text,
    read boolean default false,
    created_at timestamptz default now()
);

-- Ensure columns exist even if table was created with older schema
alter table public.messages add column if not exists image_url text;
alter table public.messages add column if not exists read boolean default false;
alter table public.messages alter column text drop not null;
alter table public.messages alter column text set default '';

-- Indexes for messages
create index if not exists idx_messages_match_id on public.messages(match_id, created_at asc);
create index if not exists idx_messages_sender_id on public.messages(sender_id);

-- Enable RLS
alter table public.messages enable row level security;

-- Policies for messages
drop policy if exists "Users can view messages in their matches" on public.messages;
create policy "Users can view messages in their matches"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and auth.uid() = any(m.user_ids)
  )
);

drop policy if exists "Users can send messages to their matches" on public.messages;
create policy "Users can send messages to their matches"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and auth.uid() = any(m.user_ids)
  )
);

drop policy if exists "Senders can edit or delete their own messages" on public.messages;
create policy "Senders can edit or delete their own messages"
on public.messages for update
to authenticated
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

drop policy if exists "Senders can delete their own messages" on public.messages;
create policy "Senders can delete their own messages"
on public.messages for delete
to authenticated
using (auth.uid() = sender_id);


-- ==============================================================================
-- 8. Table: categories (For Community Forums / Discover Tags)
-- ==============================================================================
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.categories enable row level security;

-- Policies for categories
drop policy if exists "Categories are viewable by all users" on public.categories;
create policy "Categories are viewable by all users"
on public.categories for select
to authenticated, anon
using (true);

drop policy if exists "Authenticated users can create categories" on public.categories;
create policy "Authenticated users can create categories"
on public.categories for insert
to authenticated
with check (true);

-- Seed initial categories if not present
insert into public.categories (name, description)
values
  ('General Discussion', 'Open discussions about tech, careers, and engineering'),
  ('Hackathons', 'Find teammates and collaborate on upcoming hackathons'),
  ('Projects & Startups', 'Showcase and recruit for early stage projects'),
  ('Mentorship', 'Connect mentors and mentees for career guidance'),
  ('Career & Hiring', 'Job opportunities, interview prep, and career advice')
on conflict (name) do nothing;


-- ==============================================================================
-- 9. Table: posts (Community Discussions)
-- ==============================================================================
create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    content text not null,
    category text not null,
    tags text[] default '{}',
    upvotes integer default 0,
    comment_count integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Indexes for posts
create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);

-- Enable RLS
alter table public.posts enable row level security;

-- Policies for posts
drop policy if exists "Posts are viewable by authenticated users" on public.posts;
create policy "Posts are viewable by authenticated users"
on public.posts for select
to authenticated
using (true);

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
on public.posts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
on public.posts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
on public.posts for delete
to authenticated
using (auth.uid() = user_id);


-- ==============================================================================
-- 10. Table: comments
-- ==============================================================================
create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    content text not null,
    created_at timestamptz default now()
);

-- Indexes for comments
create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_comments_user_id on public.comments(user_id);

-- Enable RLS
alter table public.comments enable row level security;

-- Policies for comments
drop policy if exists "Comments are viewable by authenticated users" on public.comments;
create policy "Comments are viewable by authenticated users"
on public.comments for select
to authenticated
using (true);

drop policy if exists "Users can create comments" on public.comments;
create policy "Users can create comments"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments"
on public.comments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
on public.comments for delete
to authenticated
using (auth.uid() = user_id);


-- ==============================================================================
-- 11. Table: votes (Post Upvotes/Downvotes)
-- ==============================================================================
create table if not exists public.votes (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    vote_type integer not null check (vote_type in (1, -1)),
    created_at timestamptz default now(),
    constraint unique_post_vote unique(post_id, user_id)
);

-- Indexes for votes
create index if not exists idx_votes_post_id on public.votes(post_id);
create index if not exists idx_votes_user_id on public.votes(user_id);

-- Enable RLS
alter table public.votes enable row level security;

-- Policies for votes
drop policy if exists "Votes are viewable by authenticated users" on public.votes;
create policy "Votes are viewable by authenticated users"
on public.votes for select
to authenticated
using (true);

drop policy if exists "Users can vote on posts" on public.votes;
create policy "Users can vote on posts"
on public.votes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can change their vote" on public.votes;
create policy "Users can change their vote"
on public.votes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their vote" on public.votes;
create policy "Users can remove their vote"
on public.votes for delete
to authenticated
using (auth.uid() = user_id);


-- ==============================================================================
-- 12. Realtime Publications
-- ==============================================================================
-- Enable Realtime for matches and messages so users get instant chat & match notifications
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;

-- ==============================================================================
-- 13. Super Admin Architecture, RBAC & Safety Systems
-- ==============================================================================

-- Account Status on users
alter table public.users add column if not exists account_status text default 'active';
alter table public.users add column if not exists suspended_until timestamptz;
alter table public.users add column if not exists suspension_reason text;
alter table public.users add column if not exists ban_reason text;
alter table public.users add column if not exists warning_count integer default 0;
alter table public.users add column if not exists last_active_at timestamptz default now();

-- 1. Table: admin_users (RBAC)
create table if not exists public.admin_users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    name text not null default 'Admin User',
    role text not null check (role in ('super_admin', 'moderator', 'support_admin', 'analyst')),
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_admin_users_role on public.admin_users(role, is_active);

-- Helper security definer functions for RLS
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where id = auth.uid() and is_active = true
  );
end;
$$ language plpgsql security definer;

create or replace function public.get_admin_role()
returns text as $$
declare
  r text;
begin
  select role into r from public.admin_users
  where id = auth.uid() and is_active = true;
  return coalesce(r, 'none');
end;
$$ language plpgsql security definer;

-- Enable RLS on admin_users
alter table public.admin_users enable row level security;

drop policy if exists "Admins can view admin users" on public.admin_users;
create policy "Admins can view admin users"
on public.admin_users for select
to authenticated
using (public.is_admin());

drop policy if exists "Super Admins can manage admin users" on public.admin_users;
create policy "Super Admins can manage admin users"
on public.admin_users for all
to authenticated
using (public.get_admin_role() = 'super_admin')
with check (public.get_admin_role() = 'super_admin');

-- 2. Table: user_reports
create table if not exists public.user_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.users(id) on delete cascade,
    reported_id uuid not null references public.users(id) on delete cascade,
    category text not null,
    description text,
    status text not null default 'pending' check (status in ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
    relevant_message_ids uuid[] default '{}',
    admin_notes text,
    resolved_by uuid references public.admin_users(id),
    resolved_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists idx_reports_reported on public.user_reports(reported_id);
create index if not exists idx_reports_status on public.user_reports(status, created_at desc);

alter table public.user_reports enable row level security;

drop policy if exists "Users can submit reports" on public.user_reports;
create policy "Users can submit reports"
on public.user_reports for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Users can view reports they submitted" on public.user_reports;
create policy "Users can view reports they submitted"
on public.user_reports for select
to authenticated
using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "Admins can manage reports" on public.user_reports;
create policy "Admins can manage reports"
on public.user_reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3. Table: moderation_actions
create table if not exists public.moderation_actions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    admin_id uuid not null references public.admin_users(id),
    action_type text not null check (action_type in ('warning', 'suspend', 'restore', 'ban', 'soft_delete', 'hard_delete')),
    reason text not null,
    duration_days integer,
    report_id uuid references public.user_reports(id),
    created_at timestamptz default now()
);

create index if not exists idx_moderation_user on public.moderation_actions(user_id);
create index if not exists idx_moderation_admin on public.moderation_actions(admin_id);

alter table public.moderation_actions enable row level security;

drop policy if exists "Admins can manage moderation actions" on public.moderation_actions;
create policy "Admins can manage moderation actions"
on public.moderation_actions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4. Table: admin_audit_logs (Immutable)
create table if not exists public.admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references public.admin_users(id),
    admin_email text not null,
    admin_role text not null,
    action text not null,
    target_type text not null,
    target_id text,
    previous_state jsonb,
    new_state jsonb,
    reason text,
    ip_address text,
    created_at timestamptz default now()
);

create index if not exists idx_audit_logs_action on public.admin_audit_logs(action, created_at desc);
create index if not exists idx_audit_logs_target on public.admin_audit_logs(target_type, target_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
on public.admin_audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;
create policy "Admins can insert audit logs"
on public.admin_audit_logs for insert
to authenticated
with check (public.is_admin());

-- 5. Table: admin_notifications
create table if not exists public.admin_notifications (
    id uuid primary key default gen_random_uuid(),
    type text not null check (type in ('new_report', 'multiple_reports', 'safety_alert', 'suspicious_activity', 'ai_error', 'system_alert')),
    title text not null,
    message text not null,
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    is_read boolean default false,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create index if not exists idx_admin_notifications on public.admin_notifications(is_read, priority, created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "Admins can manage notifications" on public.admin_notifications;
create policy "Admins can manage notifications"
on public.admin_notifications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6. Table: platform_settings
create table if not exists public.platform_settings (
    id text primary key default 'default',
    registration_enabled boolean default true,
    maintenance_mode boolean default false,
    ai_icebreakers_enabled boolean default true,
    max_daily_icebreakers integer default 15,
    default_suspension_days integer default 7,
    community_guidelines text default 'Respect other developers. Zero tolerance for spam, harassment, hate speech, or impersonation.',
    report_categories text[] default array['fake_profile', 'harassment', 'spam', 'inappropriate_content', 'scam', 'impersonation', 'unwanted_messages', 'other'],
    system_announcement text default '',
    updated_by uuid references public.admin_users(id),
    updated_at timestamptz default now()
);

-- Seed default settings row if missing
insert into public.platform_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Settings are viewable by all users" on public.platform_settings;
create policy "Settings are viewable by all users"
on public.platform_settings for select
to authenticated, anon
using (true);

drop policy if exists "Super Admins can update settings" on public.platform_settings;
create policy "Super Admins can update settings"
on public.platform_settings for update
to authenticated
using (public.get_admin_role() = 'super_admin')
with check (public.get_admin_role() = 'super_admin');

-- 7. Table: ai_usage_logs (For AI Icebreakers Analytics)
create table if not exists public.ai_usage_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    other_user_id uuid references public.users(id) on delete set null,
    category text default 'first_message',
    success boolean default true,
    error_message text,
    estimated_tokens integer default 120,
    created_at timestamptz default now()
);

create index if not exists idx_ai_usage_created on public.ai_usage_logs(created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "Admins can view ai usage logs" on public.ai_usage_logs;
create policy "Admins can view ai usage logs"
on public.ai_usage_logs for select
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can record ai usage" on public.ai_usage_logs;
create policy "Authenticated users can record ai usage"
on public.ai_usage_logs for insert
to authenticated
with check (true);

-- 8. Report notification trigger: automatically alert admins on report creation
create or replace function public.notify_admin_on_report()
returns trigger as $$
declare
  report_count integer;
  reported_name text;
begin
  select count(*) into report_count from public.user_reports where reported_id = new.reported_id;
  select name into reported_name from public.users where id = new.reported_id;

  if report_count >= 3 then
    insert into public.admin_notifications (type, title, message, priority, metadata)
    values (
      'multiple_reports',
      'High Priority: User Received ' || report_count || ' Reports',
      'User ' || coalesce(reported_name, new.reported_id::text) || ' has accumulated ' || report_count || ' reports. Immediate moderation review required.',
      'critical',
      jsonb_build_object('reported_id', new.reported_id, 'report_id', new.id, 'category', new.category)
    );
  else
    insert into public.admin_notifications (type, title, message, priority, metadata)
    values (
      'new_report',
      'New User Report: ' || new.category,
      'A report was filed against ' || coalesce(reported_name, new.reported_id::text) || ' for reason: ' || new.category,
      'medium',
      jsonb_build_object('reported_id', new.reported_id, 'report_id', new.id, 'category', new.category)
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_report_notify_admin on public.user_reports;
create trigger on_report_notify_admin
  after insert on public.user_reports
  for each row execute function public.notify_admin_on_report();

-- Enable Realtime for admin_notifications and user_reports
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'admin_notifications') then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_reports') then
    alter publication supabase_realtime add table public.user_reports;
  end if;
end $$;

-- ==============================================================================
-- Done! Super Admin Architecture & Safety Systems active.
-- ==============================================================================


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
