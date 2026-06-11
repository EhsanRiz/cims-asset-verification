-- ============================================================================
-- Migration 003 — Admin Activity Log (Phase 1)
-- ============================================================================
-- Purpose: let the app write account-activity events (logins) and let admins
-- read the full activity history, without weakening any existing policy.
--
-- Context (verified against the live DB before writing this migration):
--   * usage_logs  — RLS ON. Existing policies:
--       - "Users can read own logs"            SELECT  USING (auth.uid() = user_id)
--       - "Service role full access ..."       ALL     (auth.role() = 'service_role')
--     There was NO INSERT policy for normal users, so a client-side login
--     insert via the anon/authenticated key was silently denied. And SELECT
--     was own-rows-only, so an admin could not see everyone's logins.
--   * pap_audit_log — RLS ON. SELECT already = is_authenticated_cims_user(),
--     so an admin can already read the global change feed. No change needed
--     here; included only as a comment for the record.
--
-- This migration is idempotent (safe to re-run).
-- Apply via: Supabase Dashboard → SQL Editor, or `apply_migration`.
-- ============================================================================

-- 1. Indexes for the activity feed (newest-first, by-action, by-user) ---------
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
  ON public.usage_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_action_created
  ON public.usage_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
  ON public.usage_logs (user_id, created_at DESC);

-- 2. Allow a signed-in user to record their OWN activity events ---------------
--    WITH CHECK ties the row to the caller's auth uid, so a user can only ever
--    write rows attributed to themselves (no spoofing other users).
DROP POLICY IF EXISTS usage_logs_self_insert ON public.usage_logs;
CREATE POLICY usage_logs_self_insert
  ON public.usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow admins to read the FULL activity history --------------------------
--    is_admin() is SECURITY DEFINER and reads system_users by auth.uid(),
--    so it is unaffected by the own-row SELECT policy on system_users.
DROP POLICY IF EXISTS usage_logs_admin_select ON public.usage_logs;
CREATE POLICY usage_logs_admin_select
  ON public.usage_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- pap_audit_log: no change required. For the record, the global change feed
-- the Activity Log renders relies on the EXISTING policy:
--     audit_log_select  SELECT  USING (is_authenticated_cims_user())
-- which already lets an admin (an authenticated CIMS user) read every row.
-- ----------------------------------------------------------------------------

-- Verify (optional):
--   SELECT polname, polcmd FROM pg_policy
--   WHERE polrelid = 'public.usage_logs'::regclass ORDER BY polname;
