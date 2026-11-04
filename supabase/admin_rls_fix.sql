-- =============================================================
-- Admin RLS Bypass Policies
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Prerequisites: is_admin() function must exist (from admin_migration.sql)
-- If not, create it first:
--
-- CREATE OR REPLACE FUNCTION is_admin()
-- RETURNS boolean AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM admin_users
--     WHERE id = auth.uid() AND is_active = true
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- =============================================================

-- ---- users table ----
DROP POLICY IF EXISTS "Admin can read all users" ON users;
CREATE POLICY "Admin can read all users"
  ON users FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update any user" ON users;
CREATE POLICY "Admin can update any user"
  ON users FOR UPDATE
  USING (is_admin());

-- ---- swipes table ----
DROP POLICY IF EXISTS "Admin can read all swipes" ON swipes;
CREATE POLICY "Admin can read all swipes"
  ON swipes FOR SELECT
  USING (is_admin());

-- ---- matches table ----
DROP POLICY IF EXISTS "Admin can read all matches" ON matches;
CREATE POLICY "Admin can read all matches"
  ON matches FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete any match" ON matches;
CREATE POLICY "Admin can delete any match"
  ON matches FOR DELETE
  USING (is_admin());

-- ---- messages table ----
DROP POLICY IF EXISTS "Admin can read all messages" ON messages;
CREATE POLICY "Admin can read all messages"
  ON messages FOR SELECT
  USING (is_admin());

-- ---- user_reports table ----
DROP POLICY IF EXISTS "Admin can read all reports" ON user_reports;
CREATE POLICY "Admin can read all reports"
  ON user_reports FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update any report" ON user_reports;
CREATE POLICY "Admin can update any report"
  ON user_reports FOR UPDATE
  USING (is_admin());

-- ---- moderation_actions table ----
DROP POLICY IF EXISTS "Admin can read all moderation actions" ON moderation_actions;
CREATE POLICY "Admin can read all moderation actions"
  ON moderation_actions FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert moderation actions" ON moderation_actions;
CREATE POLICY "Admin can insert moderation actions"
  ON moderation_actions FOR INSERT
  WITH CHECK (is_admin());

-- ---- admin_audit_logs table ----
DROP POLICY IF EXISTS "Admin can read audit logs" ON admin_audit_logs;
CREATE POLICY "Admin can read audit logs"
  ON admin_audit_logs FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Admin can insert audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (is_admin());

-- ---- admin_notifications table ----
DROP POLICY IF EXISTS "Admin can read notifications" ON admin_notifications;
CREATE POLICY "Admin can read notifications"
  ON admin_notifications FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update notifications" ON admin_notifications;
CREATE POLICY "Admin can update notifications"
  ON admin_notifications FOR UPDATE
  USING (is_admin());

-- ---- platform_settings table ----
DROP POLICY IF EXISTS "Admin can read settings" ON platform_settings;
CREATE POLICY "Admin can read settings"
  ON platform_settings FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update settings" ON platform_settings;
CREATE POLICY "Admin can update settings"
  ON platform_settings FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert settings" ON platform_settings;
CREATE POLICY "Admin can insert settings"
  ON platform_settings FOR INSERT
  WITH CHECK (is_admin());

-- ---- ai_usage_logs table ----
DROP POLICY IF EXISTS "Admin can read ai usage logs" ON ai_usage_logs;
CREATE POLICY "Admin can read ai usage logs"
  ON ai_usage_logs FOR SELECT
  USING (is_admin());
