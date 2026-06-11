-- ============================================================================
-- Migration 004 — Session tracking (Phase 2)
-- ============================================================================
-- One row per browser session. The client creates a row at login and stamps
-- last_seen_at on a heartbeat while the tab is active; ended_at is set on an
-- explicit logout. Session duration is therefore:
--     coalesce(ended_at, last_seen_at) - started_at
-- i.e. an ESTIMATE of active time (a tab closed without logout simply stops
-- heart-beating, so last_seen_at is the last point we know the user was there).
--
-- Name / email / role are denormalised so the admin Activity Log renders
-- without reading other users' system_users rows (own-row RLS there).
-- Idempotent; safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid NOT NULL,
  user_name     text,
  user_email    text,
  user_role     text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  user_agent    text
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen
  ON public.user_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user
  ON public.user_sessions (auth_user_id, last_seen_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- A signed-in user may create their OWN session row.
DROP POLICY IF EXISTS user_sessions_self_insert ON public.user_sessions;
CREATE POLICY user_sessions_self_insert
  ON public.user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- A signed-in user may update ONLY their own session row (heartbeat / end).
DROP POLICY IF EXISTS user_sessions_self_update ON public.user_sessions;
CREATE POLICY user_sessions_self_update
  ON public.user_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- A user may read their own sessions; admins may read everyone's.
DROP POLICY IF EXISTS user_sessions_self_select ON public.user_sessions;
CREATE POLICY user_sessions_self_select
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS user_sessions_admin_select ON public.user_sessions;
CREATE POLICY user_sessions_admin_select
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Verify (optional):
--   SELECT polname, polcmd FROM pg_policy
--   WHERE polrelid = 'public.user_sessions'::regclass ORDER BY polname;
