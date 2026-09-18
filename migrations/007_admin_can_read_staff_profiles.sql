-- 007_admin_can_read_staff_profiles.sql
--
-- Fix: the Deactivate / Activate / Edit buttons in Staff Management were
-- silently doing nothing for the admin.
--
-- Cause: RLS SELECT on system_users was `auth_user_id = auth.uid()` — the
-- caller's own row and nothing else. StaffManagement loads the staff list with
--
--     supabase.from('system_users').select('id, email, is_active, auth_user_id')
--
-- which therefore returned exactly one row (the admin's own). mergeRows() then
-- set `profile_id: null` on every other staff member, and toggleActive() bails
-- on its first line:
--
--     if (!row.profile_id) return
--
-- No error, no alert — the button just did nothing. The UPDATE policy was
-- already `is_admin()`, so the write was never the problem; the admin simply
-- could not see the rows to act on.
--
-- Fix: let an admin read all staff profiles. Everyone else still sees only
-- their own row.

DROP POLICY IF EXISTS sys_users_select ON public.system_users;

CREATE POLICY sys_users_select ON public.system_users
  FOR SELECT
  USING (auth_user_id = auth.uid() OR public.is_admin());
