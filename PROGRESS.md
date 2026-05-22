# CIMS — Progress & Handoff Notes

> **Last updated:** 2026-05-22
> **Production:** https://cims.4dcs.co.za (auto-deploys from `main` on Render)
> **Repo:** https://github.com/EhsanRiz/cims-asset-verification (public)
> **Supabase project:** `zicpfqqdszxolvzqfqjs` (CIMS-v2)
> **R2 storage:** `cims-documents` bucket, public via `https://files.4dcs.co.za`

This document captures the state of CIMS at handoff, what's been built, what
the operational gotchas are, and what's still outstanding. Read it before
making changes.

---

## 1. Snapshot

| Metric | Value |
|---|---|
| Total PAPs | 1,388 |
| Routes | 25 (17 rural + 8 urban) |
| Verified | 1,302 |
| Marked paid / have payment doc | 4 |
| Active CIMS users | 2 (Ehsan as admin, Mamokuena as user/field surveyor) |
| Audit events recorded | 14 |

The deployed bundle hash is whatever `curl https://cims.4dcs.co.za/ | grep assets/index-` returns — if you've just pushed and want to confirm Render has finished its rebuild, watch this poll for the hash to flip.

---

## 2. Architecture quick-reference

- **Frontend:** React + Vite, single bundle, HashRouter. Code lives in `src/`. The big file is `src/pages/Dashboard.jsx` (~4200 lines) — it owns dashboard state, all PAP-detail tabs, modals, and the merge flow.
- **Backend:** `server.cjs` — Express on Render. Two endpoints: `POST /api/upload` and `DELETE /api/delete`. Both go through `requireAuth` + `requireEditor` middleware. Files go to Cloudflare R2.
- **Database:** Supabase Postgres. RLS is on every table. Helper functions: `is_admin()`, `is_editor()`, `is_authenticated_cims_user()` (all SECURITY DEFINER, read role from `system_users`).
- **Auth:** Supabase Auth (email+password). `system_users.auth_user_id` links the Auth user to the CIMS profile. `authorized_emails` is an allow-list — only emails on it can register.
- **Realtime:** `households`, `edit_requests`, `notifications`, and `pap_audit_log` are all in the `supabase_realtime` publication. The Change History panel subscribes live.

### Role model

```
admin                 → full access, user management, Rates Master, direct delete
user (Mamokuena)      → editor + approver (special-cased via isMamokuena flag)
clo, arco, rco, essm  → editor + approver
client                → view-only (legacy LLWDSP III viewer tier)
assistant_clo, pm, ict_dmo → view-only
```

Two flags drive almost all gating in the UI:

- `canEdit  = !isViewOnly` — can edit field values
- `canApprove = isAdmin || isMamokuena || ['clo','arco','rco','essm'].includes(role)` — can approve edit requests, mark payment status, edit Other Assets, see the Rates tab, merge PAPs

### File-handling flow

- File uploads: client → `apiFetch('/api/upload', { body: FormData })` → Express `requireAuth + requireEditor` → R2 PutObject → returns `{ url, key }` → client writes the URL/key into the appropriate jsonb column on `households` via PostgREST.
- `apiFetch` (in `src/lib/supabase.js`) attaches the current session's `access_token` as a Bearer header.
- File deletes: `apiFetch('/api/delete', { method: 'DELETE', body: { key } })` → Express → R2 DeleteObject → client clears the column.

---

## 3. What shipped in the latest session (2026-05-22)

Commits listed newest-first:

| Commit | What it does |
|---|---|
| `b5b62f2f` | **Merge delete actually works for non-admins.** RLS DELETE on households is admin-only (preserves the request-delete workflow for ordinary edits). The merge was hitting that and silently no-op'ing for Mamokuena. New SECURITY DEFINER RPC `merge_delete_household(loser_id uuid)` gates on `is_editor()` and returns the affected row count; the client throws if zero rows were affected. |
| `a7344eeb` | **Merge UX redesigned.** Per-field "pick which value to keep" picker replaced by a section-by-section review screen. PAP Information uses winner-first / backfill-from-loser with a visible badge per field. Location, Valuation, Documents, Payment, Comments, Other Assets — all auto-combined; the modal shows the resolved result before you click Confirm. One resolver (`resolveMergeResult`) drives both the preview and the DB write so they can't diverge. |
| `6722fd00` | **Multi-asset merge for A/B/C-suffixed file numbers.** When two PAPs' file numbers match after stripping a trailing letter (e.g. `…3011-031A` / `…3011-031B`), the modal auto-suggests "Combine as multi-asset PAP". In combine mode each PAP becomes one row in the surviving PAP's `land_assets_json` carrying its own land use + GPS + lat/lon, and the trailing letter is stripped from the file number. Multi-asset valuation table now has a Location column. |
| `c03a14d4` | **Valuation lockdown + Other Assets editor.** Perm/Temp rate fields are now display-only on the PAP detail page (they're sourced from `valuation_land_rates` via the Rates Master — single source of truth). Total Compensation auto-calculates live from `area×rate + disturbance`. Rates button is now gated on `canApprove` instead of `isAdmin` so CLOs and Mamokuena can manage the Rates Master. Other Affected Assets card always renders and supports add/edit/delete; type is a grouped dropdown sourced from `valuation_asset_rates` (30 types across Crops/Disturbance/Fence/Other/Structure), rate auto-fills (locked), value = qty × rate. |
| `080e561c` | **Change History updates live** via a Supabase Realtime subscription on `pap_audit_log` filtered by household_id. No more "refresh to see your edit". Also added the table to `supabase_realtime` publication. |
| `9d7738c6` | **Payment status widened + PAPS PAID counter logic + History placement.** Payment Status form was admin-only; now gated on `canEdit` (= `canApprove`). The dashboard "PAPS PAID" tile and its drill-down now count `payment_status='paid' OR payment_documents.length > 0` so uploads show up immediately. The HistoryTab component existed but had no tab button — moved inline into the Details tab as a Change History card under Comments & Notes. |
| `2ef68d6b` | **Auto-upload + visible upload status.** The DocumentUploader's queue + separate "Upload All" button confused users (Mamokuena specifically) into thinking files were saved when they were still queued. Adding files now triggers upload immediately, per-row status (spinner / ✓ / ✗ with error text + Retry) is visible, alert on failure, and successful items auto-clear after ~2s. |

### Database migrations applied (not in repo unless re-applied via Supabase MCP)

- `add_pap_audit_log` — created `pap_audit_log` table + RLS + indexes (earlier session).
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.pap_audit_log;` (commit `080e561c`).
- `merge_delete_household(uuid)` SECURITY DEFINER function + GRANT EXECUTE TO authenticated (commit `b5b62f2f`).

If you're rebuilding the DB from scratch, these need to be re-applied.

---

## 4. Outstanding WIP

From the original backlog, still open:

1. **Retire legacy username/password code path.** `system_users` still has `username` and `password` columns and `signIn(username,password)` still exists in `src/lib/supabase.js`. Gated on Mamokuena completing email-based registration (she has, so this can be cleaned up).
2. **Routes 3006/3007/3008 manual mapping** — 152 PAPs need their `route_name` mapping confirmed against the official route list.
3. **6 duplicate PAP candidates** — needs manual review (the merge tool now handles this cleanly).
4. **155 unmatched PAPs** — needs route assignment.
5. **Deeper UI role-gating in sub-components** — most major actions are now correctly gated, but a deeper sweep through smaller actions (e.g. inline edit buttons on Valuation rows) is still useful.

User-side actions:
- Email the 16 GRM staff the registration guide (in workspace as `CIMS Staff Registration Guide.docx`).

---

## 5. Operational gotchas (read before editing)

1. **`Dashboard.jsx` is large.** Always `git pull` (or fresh `git clone --depth N`) before edits. Past sessions have had a stale local `Dashboard.jsx` silently overwrite shipped features when re-uploaded. Don't paste a stale copy.
2. **The workspace mount at `~/Documents/Claude/Projects/CIMS/src/` is stale** — it predates the recent work. Don't trust it as a source of truth. Treat it only as a delivery target for files Ehsan should be able to open locally.
3. **Supabase RLS DELETE on households is admin-only by design.** Don't widen it. For merge/admin-flows that need to delete, add a SECURITY DEFINER RPC like `merge_delete_household` — keeps the request-delete workflow for ordinary edits intact.
4. **Cloudflare R2 file deletes aren't tied to DB row deletes.** If you delete a PAP/document row, the R2 object stays. Document/CAF/payment-doc delete handlers go through `/api/delete` to clean up R2. The merge flow only concatenates references — it doesn't delete from R2.
5. **Auto-set fields on PAP records.** `last_edited_at` and `last_edited_by_name` are bumped on every meaningful write; `updated_at` only gets touched by some paths (notably NOT by document-array updates). Don't rely on `updated_at` as a recency signal — use `last_edited_at`.
6. **Audit log writes are fire-and-forget.** Failure to audit must not block the user action. The `audit()` helper in Dashboard.jsx + `logAudit()` in supabase.js handle this. Don't add throws in those paths.
7. **`detectSessionInUrl: false`.** HashRouter + Supabase Auth produce double-`#` URLs after email confirmation/reset. The SDK can't parse these reliably; we parse them by hand in `Login.jsx` and `ResetPassword.jsx`. If you re-enable detectSessionInUrl, those flows will break.
8. **AuthProvider deadlock pattern.** Inside `onAuthStateChange`, never `await` anything — wrap the work in `setTimeout(0)` or schedule it differently. The Supabase v2 SDK holds a lock during the listener that deadlocks with `getUser()`/`getSession()` calls.
9. **PAT handling.** GitHub PATs the user provides inline should never be persisted in `.git/config`. After any clone-with-token, run `git remote set-url origin https://github.com/...` to strip the token. The post-push step `grep -c "github_pat" .git/config` should always return `0`.

---

## 6. Resume / recovery instructions

If you're picking this up fresh:

```bash
# 1. Clone — repo is public
rm -rf /tmp/cims && cd /tmp && git clone --depth 30 https://github.com/EhsanRiz/cims-asset-verification.git cims
cd cims && git log --oneline -10

# 2. Install + sanity-build
npm install --no-audit --no-fund
npm run build   # should complete in ~2s, output index-XXXX.js bundle

# 3. Confirm what's live
curl -s https://cims.4dcs.co.za/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'

# 4. To push, you'll need a PAT from Ehsan — push inline, then sanitise:
git push https://EhsanRiz:<PAT>@github.com/EhsanRiz/cims-asset-verification.git main
git remote set-url origin https://github.com/EhsanRiz/cims-asset-verification.git
grep -c "github_pat" .git/config   # must print 0
```

To inspect production data (read or write) use the Supabase MCP with
project_id `zicpfqqdszxolvzqfqjs`. Don't bypass RLS in queries that
test client behaviour.

---

## 7. Backup files (preserve)

These are the only restore path for production data that's been deleted:

- `~/Documents/Claude/Projects/CIMS/boribeng_levi2_backup_2026-05-19.json` — 34 households + the route row, deleted during a cleanup pass.
- `~/Documents/Claude/Projects/CIMS/outlier_paps_backup_2026-05-19.json` — 3 Bolt-era demo PAPs.
- `~/Documents/Claude/Projects/CIMS (1)/legacy_users_backup_2026-05-20.json` — legacy `system_users` snapshot from the username/password → email migration.

Don't delete these.
