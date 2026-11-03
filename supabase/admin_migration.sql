-- ==============================================================================
-- StackSwipe Super Admin Migration (Only New Tables, Columns & Functions)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Add moderation and status columns to public.users
alter table public.users add column if not exists account_status text default 'active' check (account_status in ('active', 'suspended', 'banned', 'soft_deleted'));
alter table public.users add column if not exists suspended_until timestamptz;
alter table public.users add column if not exists suspension_reason text;
alter table public.users add column if not exists ban_reason text;
alter table public.users add column if not exists warning_count integer default 0;
alter table public.users add column if not exists last_active_at timestamptz default now();

create index if not exists idx_users_account_status on public.users(account_status);
create index if not exists idx_users_last_active on public.users(last_active_at desc);

-- 2. Table: admin_users (Role-Based Access Control)
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

-- 3. Table: user_reports
create table if not exists public.user_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.users(id) on delete cascade,
    reported_id uuid not null references public.users(id) on delete cascade,
    category text not null check (category in ('fake_profile', 'impersonation', 'harassment', 'inappropriate_behaviour', 'spam', 'scamming', 'suspicious_account', 'unwanted_messages', 'other')),
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

-- 4. Table: moderation_actions
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

-- 5. Table: admin_audit_logs (Immutable log)
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

-- 6. Table: admin_notifications
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

-- 7. Table: platform_settings
create table if not exists public.platform_settings (
    id text primary key default 'default',
    registration_enabled boolean default true,
    maintenance_mode boolean default false,
    ai_icebreakers_enabled boolean default true,
    max_daily_icebreakers integer default 15,
    default_suspension_days integer default 7,
    community_guidelines text default 'Respect other developers. Zero tolerance for spam, harassment, hate speech, or impersonation.',
    report_categories text[] default array['fake_profile', 'impersonation', 'harassment', 'inappropriate_behaviour', 'spam', 'scamming', 'suspicious_account', 'unwanted_messages', 'other'],
    system_announcement text default '',
    updated_by uuid references public.admin_users(id),
    updated_at timestamptz default now()
);

-- Seed default settings
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

-- 8. Table: ai_usage_logs (For AI Icebreakers Analytics)
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

-- 9. Trigger: notify admins on report creation
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

-- 10. Enable Realtime Publications
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'admin_notifications') then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_reports') then
    alter publication supabase_realtime add table public.user_reports;
  end if;
end $$;

-- 11. Authorize Super Admin email explicitly
insert into public.admin_users (id, email, name, role, is_active)
select id, email, coalesce(raw_user_meta_data->>'full_name', 'Super Admin'), 'super_admin', true
from auth.users
where lower(email) = 'aarchaullasan@gmail.com'
on conflict (id) do update set role = 'super_admin', is_active = true;

-- ==============================================================================
-- Super Admin Migration Complete!
-- ==============================================================================
