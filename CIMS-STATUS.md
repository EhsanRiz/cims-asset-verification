# CIMS — Status Report

**Compensation Information Management System**
Asset Registration & Verification for LLWDP III

> **Report date:** 13 September 2026
> **Prepared from:** live Supabase data, the `main` branch, and open PR #3

---

## 1. What CIMS is

CIMS is a web application built for the **Lesotho Lowlands Water Development
Project Phase III (LLWDP III)**. It is the system of record for compensating
people whose land or assets are affected by the project's pipeline routes.

Each affected household is a **PAP** (Project Affected Person). For every PAP,
CIMS tracks:

| What it holds | Detail |
|---|---|
| **Identity** | Name, gender, ID number, phone, occupation, villages, community council |
| **Location** | Route, route type (rural/urban), land use, GPS coordinates |
| **Valuation** | Affected area (permanent + temporary) × official rates, other affected assets (trees, fences, crops, structures), disturbance allowance → total compensation |
| **Documents** | PAP photo, ID document, asset photo, map, Compensation Agreement Form (CAF), supporting documents |
| **Payment** | Status (not paid / partial / paid), amount, date, reference, payment proof documents |
| **History** | Full change log — who changed which field, when, and from what to what |

The core workflow: field staff register and verify PAPs → valuation is computed
from a central rates master → a Compensation Agreement Form is signed → payment
is recorded against the PAP.

CIMS has two front doors:

- **Dashboard** — the main workspace. Browse by route, open a PAP, edit details,
  manage valuation, upload documents, record payments, merge duplicates, export
  to Excel.
- **Collect** — a simplified mobile-friendly wizard for field surveyors to
  register new PAPs, which then go into an approval queue.

**Live at:** https://cims.4dcs.co.za

---

## 2. Where CIMS is right now — the numbers

Pulled live from the production database on 13 September 2026.

| Metric | Value |
|---|---|
| Total PAPs | **1,405** |
| Verified / approved | **1,302** (93%) |
| Paid or have a payment document | **155** |
| PAPs with an uploaded CAF | **135** |
| PAPs with no route assigned | **0** |
| Routes (approved) | **24** — 16 rural, 8 urban |
| Routes awaiting approval | 0 |
| Active user accounts | **19** (all registered) |
| PAP change-history events | **233** |
| Rate changes recorded | 0 (audit trail is new) |
| Pending edit requests | 0 |

### Growth since the last handoff (22 May 2026)

| | May 2026 | Sep 2026 |
|---|---|---|
| Total PAPs | 1,388 | 1,405 |
| Paid / payment doc | 4 | **155** |
| Active users | 2 | **19** |
| Audit events | 14 | 233 |

The headline change is that CIMS moved from a two-person tool into genuine
multi-user operational use: the full GRM field team is onboarded, and payment
recording has gone from a handful of test rows to 155 PAPs.

---

## 3. Who uses it

19 active accounts, all registered via email:

| Role | People | What they can do |
|---|---|---|
| **Administrator** | Ehsan Rizvi | Everything — user management, direct delete, all approvals |
| **Field Surveyor** (`user`) | Mamokuena, Hlalefang Lefa, Palesa Mabaso | Register and edit PAPs (Mamokuena also approves, by legacy exception) |
| **CLO** | 'Malerato Motlomelo, Nobantu Jason, Taemane Maqolo | Edit + approve edit requests, payments, merges |
| **ARCO** | Thabang Toloane | Edit + approve |
| **RCO** | Mojabeng Kibiti | Edit + approve, **plus route approvals** |
| **ESS Manager** | Mosiuoa Mohloua | Edit + approve |
| **Assistant CLO** | 'Maneo Seteka, Mabaloe Rampai, Morai Matlakane, Moroane Mpotjoana, Mpolokeng Sephelane, Nkoebe Malikhi, Tsepo Adam, Zellose Khemisi | Edit + upload photos, documents, CAFs — edits go through approval |
| **ICT & DMO** | Tsepo Shata | View only |

There are 8 further inactive rows (old test accounts, pre-registration
duplicates, and the legacy read-only "LLWDSP III" client login) — 27 rows in
`system_users` in total.

### Permission model

Three flags drive nearly all gating:

- **`canEdit`** — edit field values, upload photos/documents/CAFs, propose
  routes, edit the Rates Master. Everyone except `pm`, `ict_dmo`, `client`.
- **`canApprove`** — approve edit requests and new-PAP registrations, set
  payment status, merge PAPs. Admin, CLO, ARCO, RCO, ESSM (and Mamokuena).
- **`isRouteApprover`** — approve or reject proposed routes. Admin and RCO only.

Permissions are enforced in **four places**, all kept in sync: the frontend role
sets, the dashboard gating, the Express upload middleware, and Postgres
row-level security. The database is the real boundary — the UI gating is
convenience, not the control.

---

## 4. Architecture

```
React + Vite (single bundle, HashRouter)
        │
        ├── Supabase Postgres  ← row-level security on every table
        │     Auth: email + password, allow-list gated
        │     Realtime: households, edit_requests, notifications, audit log
        │
        └── Express (server.cjs) on Render
              └── Cloudflare R2  ← documents, photos, CAFs
                    served from files.4dcs.co.za
```

| Layer | Detail |
|---|---|
| **Frontend** | React + Vite + Tailwind. `src/pages/Dashboard.jsx` is the big one (~4,900 lines) — it owns dashboard state, all PAP-detail tabs, modals, the merge flow, and the rates master. |
| **Backend** | `server.cjs` — Express on Render. Two endpoints (`POST /api/upload`, `DELETE /api/delete`), both behind `requireAuth` + `requireEditor`. |
| **Database** | Supabase Postgres, project `zicpfqqdszxolvzqfqjs`. 19 tables, RLS on all of them. Role helpers `is_admin()`, `is_editor()`, `is_route_approver()`, `is_authenticated_cims_user()` are SECURITY DEFINER and read from `system_users`. |
| **Files** | Cloudflare R2 bucket `cims-documents`, public via `https://files.4dcs.co.za`. |
| **Hosting** | Render, auto-deploys from `main`. |

### Key tables

`households` (the PAPs, 1,405 rows) · `routes` (24) · `system_users` (26) ·
`edit_requests` (659) · `notifications` (1,389+) · `pap_audit_log` (233) ·
`rates_audit_log` (new) · `valuation_land_rates` (10) ·
`valuation_asset_rates` (30) · `user_sessions` (90) · `usage_logs` ·
`authorized_emails` (20) · plus `beneficiaries`, `co_owners`,
`household_assets`, `banking_details`, `communal_assets`.

---

## 5. How compensation is calculated

Total compensation for a PAP is:

```
  land value          (area × official rate, per land asset row)
+ other assets value  (quantity × official rate, per asset row)
+ disturbance allowance
= TOTAL COMPENSATION
```

Rates are **not** typed per PAP. They live in a central **Rates Master**
(10 land rates keyed by land use × route type; 30 asset rates across Crops,
Disturbance, Fence, Structure, Tree, Vegetation, Other). Rate fields on the PAP
page are locked and display-only — changing a rate is done once in the Rates
Master and propagates to every affected PAP, with totals recomputed
automatically.

The same formula is implemented in exactly two places, deliberately mirrored:
`computeHouseholdTotal()` in the frontend, and the
`land_assets_value()` / `other_assets_value()` SQL helpers used by the
propagation functions.

---

## 6. What changed in the current work (PR #3 — open)

**Branch:** `claude/cims-asset-verification-permissions-u8u8rh`
**PR:** https://github.com/EhsanRiz/cims-asset-verification/pull/3
**Status:** open, mergeable, no conflicts. **Not yet merged — not yet live.**

Four client-requested changes:

### 1. Assistant CLOs can upload pictures, documents and CAFs
`assistant_clo` promoted from view-only to editor across all four enforcement
layers. This is the biggest practical change — it unblocks 8 of the 19 active
users, who previously could only look. Their edits still route through the
approval queue, so oversight is preserved.

### 2. Anyone can add routes, with a trail and RCO approval
New **Add Route** button. RCO/admin additions go live immediately; everyone
else's are created as *pending* and appear in a "Routes Pending RCO Approval"
strip where the RCO approves or rejects with an optional reason. The `routes`
table records who proposed it, who reviewed it, when, and why if rejected.
Route cards show "Added by X". Pending routes stay out of every route picker
until approved. Notifications flow to the RCO on proposal and back to the
proposer on the decision.

### 3. Rates editable by any editor, with a full audit trail
Rates editing opened from admin-only to all editors. Every insert, update and
delete on either rates table is now captured by **database triggers** into a new
`rates_audit_log` — who, when, old value → new value. Because it is enforced at
the database level it cannot be bypassed from the client. A new **Change
History** tab in the Rates Master shows the trail.

*Security fix found along the way:* the two rate-propagation functions ran with
elevated privileges and had **no role check at all** — any authenticated user
could have called them directly to rewrite rates across every PAP. Both are now
gated.

### 4. Compensation now auto-calculates when assets are added
Two root causes, both fixed:

- **Other Affected Assets were never counted in the total.** They are now
  included everywhere — on screen, on save, on edit-request approval, on merge,
  and in the SQL propagation. The valuation panel shows an explicit "Other
  Assets" line so the arithmetic is visible.
- **New land-asset rows were created with blank, locked rates**, so their
  subtotal stayed at zero no matter what area was entered. Rows now auto-fill
  their rates from the Rates Master by land use and route type, and changing
  land use re-pulls the official rates.

### 5. Follow-up fix (added today, 13 Sep)
Testing against live data surfaced a defect in the above: 47 households store
their other-assets list as a *double-encoded* JSON string rather than a JSON
array (a legacy import artefact). The frontend tolerates this; the new SQL
helpers did not, and would abort with a scalar error. In practice that meant
**saving the Rural/Res land rate would have failed outright**. Now hardened —
every array read goes through a normaliser, and affected rows are repaired as
they pass through. Verified clean across all 1,405 households.

---

## 7. Deployment state

| | |
|---|---|
| **Database** | Migrations `005_permissions_routes_rates` and `006_json_array_hardening` are **applied to production**. |
| **Frontend / backend** | **Not deployed.** PR #3 is open against `main`; Render deploys on merge. |
| **Is the split safe?** | Yes. The database changes are additive and backward-compatible (new columns with defaults, unchanged function signatures, RLS only widened). The currently-live bundle keeps working — assistant CLOs simply won't see the new edit UI until the merge. |

**To go live:** merge PR #3. Render rebuilds from `main` automatically.

---

## 8. Outstanding work

### Blocking nothing, but worth doing

1. **Merge PR #3.** The work is complete and tested; it has been sitting open
   since 7 August. Nothing else in this list should be started before it lands.
2. **224 PAPs have a stale stored total.** Their `total_compensation` predates
   the "include other assets" fix, so it is out of step with the new formula.
   They self-correct the next time each PAP is saved or a rate propagates
   through them. A one-off recompute across all rows would settle it in one
   pass — worth doing deliberately, after the merge, rather than silently.
3. **47 PAPs with double-encoded other-assets data.** Harmless now that the
   functions tolerate it, but normalising them would remove the special case.

### Carried over from earlier

4. **Retire the legacy username/password path.** `system_users` still carries
   `username` and `password` columns and `signIn(username, password)` still
   exists. Everyone has migrated to email login, so this is safe to remove.
5. **6 duplicate PAP candidates** need manual review. The merge tool handles
   these cleanly now.
6. **Deeper UI role-gating sweep** through smaller actions (inline edit buttons
   on valuation rows, etc.). Major actions are correctly gated.

Two items from the May handoff now look **resolved** and can probably be struck:
the "155 unmatched PAPs" and the "Routes 3006/3007/3008 mapping" — every one of
the 1,405 PAPs currently has a route assigned. Worth a spot-check against the
official route list before closing them off for good.

### One design question worth settling

The **Mamokuena approver exception** is still a name-string match
(`full_name.includes('mamokuena')`) rather than a real role. It works, but it is
fragile — a rename or a second Mamokuena would break it, and it is invisible to
anyone reading the role table. Giving her a proper approver role and deleting
the special case would be a small, clean change.

---

## 9. Operational notes (read before editing)

1. **`Dashboard.jsx` is large — always pull before editing.** Past sessions have
   had a stale local copy silently overwrite shipped features on re-upload.
2. **RLS DELETE on `households` is admin-only by design.** Don't widen it. Flows
   that need to delete get a SECURITY DEFINER function (see
   `merge_delete_household`), which keeps the request-delete workflow intact.
3. **R2 file deletes are not tied to database row deletes.** Deleting a PAP row
   leaves its files in R2. Document deletes go through `/api/delete` to clean up.
4. **Use `last_edited_at`, not `updated_at`, as the recency signal.**
   `updated_at` isn't touched by every write path.
5. **Audit writes are fire-and-forget** by design — a failed audit must never
   block a user action. Don't add throws to those paths.
6. **`detectSessionInUrl: false` is deliberate.** HashRouter plus Supabase Auth
   produce double-`#` URLs after email confirmation; we parse them by hand.
   Re-enabling it breaks password reset and registration.
7. **Never `await` inside `onAuthStateChange`.** The Supabase v2 SDK holds a lock
   during the listener that deadlocks against `getUser()`/`getSession()`.
   Defer with `setTimeout(..., 0)`.
8. **Never persist a GitHub token in `.git/config`.** After any clone-with-token,
   reset the remote URL; `grep -c "github_pat" .git/config` must return 0.

### Backup files — do not delete

These are the only restore path for production data that has been removed:

- `boribeng_levi2_backup_2026-05-19.json` — 34 households + route row
- `outlier_paps_backup_2026-05-19.json` — 3 demo PAPs
- `legacy_users_backup_2026-05-20.json` — pre-migration `system_users` snapshot

---

## 10. Summary

CIMS is **in active production use** and healthy. 1,405 PAPs are registered,
93% verified, and the full 19-person field team is onboarded and working in it.
The system has matured past its original two-user shape: it now has proper
role-based access control enforced at the database level, a complete change
history, and a central rates master driving valuation.

The one thing standing between the current state and the client's requested
changes is **merging PR #3**. The database side is already live and safe; the
application side is built, tested, and waiting. Once merged, assistant CLOs get
the upload rights they need, routes can be added by field staff under RCO
control, rates become editable with a permanent audit trail, and compensation
totals stop under-counting other affected assets.

---

*Report generated 13 September 2026 from live production data.*
