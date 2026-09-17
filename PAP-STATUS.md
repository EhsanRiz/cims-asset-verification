# PAP Register — Status Report

**CIMS · Compensation Information Management System**
LLWDP III Asset Registration & Verification

> **Report date:** 17 September 2026
> **Source:** live production database (`zicpfqqdszxolvzqfqjs`), read directly

---

## Headline

| Metric | Value |
|---|---|
| **Total PAPs on the register** | **1,405** |
| **Verified** | **1,302 (93%)** |
| Pending verification | 103 (7%) |
| Marked paid | 88 |
| Shown as paid on the dashboard tile | 155 |
| Total compensation recorded | **M 45,225,942.93** |

Verification is essentially complete. Payment is the active phase, and it is
where the data needs attention.

---

## 1. Verification

| Status | PAPs | Share |
|---|---:|---:|
| Verified | 1,302 | 93% |
| Pending | 103 | 7% |
| **Total** | **1,405** | **100%** |

### Where the 103 unverified PAPs sit

All outstanding verification is concentrated in seven routes, and two of them
account for 77 of the 103.

| Route | PAPs | Verified | **Unverified** | Paid | CAFs |
|---|---:|---:|---:|---:|---:|
| Boribeng – Levi 1 | 77 | 34 | **43** | 0 | 0 |
| Serutle – Katamelo | 127 | 91 | **36** | 11 | 4 |
| Rasekila – WTW | 48 | 31 | **17** | 1 | 2 |
| Qholaqhoe J – Ha Chaba | 114 | 111 | **3** | 0 | 19 |
| Khukhune – Muela Junction | 60 | 58 | **2** | 0 | 6 |
| Rampai – Matlakeng | 46 | 45 | **1** | 0 | 25 |
| Molapo – Matatase | 36 | 35 | **1** | 0 | 11 |
| | | | **103** | | |

**Boribeng – Levi 1 is the clear priority** — 43 unverified, no CAFs uploaded,
no payments recorded. It is the least advanced route on the register.
**Serutle – Katamelo** is second at 36. The remaining five routes have 7
between them and are effectively finished.

The other 18 routes on the register are fully verified.

---

## 2. Payment

| Status | PAPs |
|---|---:|
| Marked **paid** | 88 |
| Marked **partial** | 1 |
| Marked **not paid** | 1,316 |
| Have a payment document uploaded | 149 |

### ⚠️ These figures do not reconcile

The dashboard "PAPS PAID" tile reports **155** because it counts a PAP as paid
if *either* the status is `paid` **or** a payment document has been uploaded.
Underneath that headline:

| | PAPs | What it means |
|---|---:|---|
| Status `paid` **and** document present | 82 | Consistent — no action |
| Document uploaded, **status not set to paid** | **67** | Payment likely made but never recorded |
| Status `paid`, **no document** | 6 | Marked paid without proof attached |

**The true payment position is somewhere between 88 and 155**, depending on
which signal is trusted. This is the single largest data-quality gap on the
register and should be reconciled before any payment reporting goes to the
client or the funder.

**Recommended action:** review the 67 PAPs that have a payment document but no
paid status. If the document is genuine proof of payment, set the status and
capture the amount, date and reference so the two signals agree.

---

## 3. Compensation values

| Metric | Value |
|---|---:|
| Total compensation across the register | **M 45,225,942.93** |
| PAPs with a compensation figure > 0 | 1,194 |
| PAPs sitting at zero compensation | 211 |
| PAPs with "other affected assets" recorded | 690 |

The 211 zero-value PAPs are worth a pass — some will be genuine (no affected
area, no assets), but at 15% of the register it is worth confirming they are
not simply un-valued.

> **Note:** 224 PAPs currently carry a stored total that predates the recent
> fix to include Other Affected Assets in the calculation. Those totals
> self-correct the next time each PAP is saved or a rate propagates through it.
> A deliberate one-off recompute would settle them in a single pass.

---

## 4. Documentation status

| Document | PAPs | Notes |
|---|---:|---|
| Compensation Agreement Form (CAF) uploaded | 135 | |
| **CAF marked as signed** | **0** | ⚠️ see below |
| Supporting documents | 1,338 | 1,864 files in total |
| Payment documents | 149 | see §2 |
| PAP photograph | 2 | ⚠️ effectively absent |
| ID document | 3 | ⚠️ effectively absent |
| Asset photograph | 9 | |
| Map | 1 | |

### ⚠️ CAF signature status is not being tracked

135 CAFs have been uploaded, but **not one has been marked as signed**. Only a
single CAF record even carries the signature field at all. The "Mark as Signed"
control exists in the Documents tab and works — it simply is not being used.

This matters because a signed CAF is the legal basis for paying a PAP. Right
now the system cannot answer "which PAPs have a signed agreement?", which will
be a problem the moment anyone audits the payment run. Worth a short briefing
to the CLOs on using that button, and a back-fill pass over the 135 existing
CAFs.

### ⚠️ PAP photos and ID documents are missing

Only 2 PAPs have a photograph and 3 have an ID document, against 1,302 verified
records. If these were expected to arrive with the original data import, they
did not. Worth confirming whether they exist elsewhere (in the supporting
documents, or outside CIMS entirely) before treating this as a collection gap.

---

## 5. Items that look alarming but are not

**"1,404 PAPs pending approval."** The `approval_status` field reads *pending*
on almost every record, but this is just the default value carried on legacy
imported rows — it is not a work queue. Only one PAP has ever been created
through the Collect wizard, and there are **zero** genuine registrations
awaiting approval.

**Pending edit requests: zero.** Nothing is sitting in the edit-approval queue.

---

## 6. One data issue to fix

Households reference **25 distinct route names, but the `routes` table holds
only 24**. The route **"Serutle – Katamelo" (127 PAPs)** exists on PAP records
but has no row in the routes table.

Nothing is broken today — the dashboard derives its route list from the PAP
data as well as the routes table, so the route displays normally. But once the
new route-approval workflow goes live, routes become a properly managed table
and this orphan should be added so it behaves consistently with the rest.

Separately, the `routes.pap_count` column is **stale** — it records 34 PAPs for
Boribeng – Levi 1 where the actual count is 77. Nothing reads it for display
(the dashboard counts live from the PAP data), but it should not be trusted.

---

## Summary and suggested priorities

| # | Action | Why |
|---|---|---|
| 1 | Reconcile the **67 PAPs** with a payment document but no paid status | Payment reporting is currently ambiguous by a factor of ~1.8× |
| 2 | Push **Boribeng – Levi 1** (43 unverified, 0 CAFs, 0 payments) | Least advanced route by a wide margin |
| 3 | Start recording **CAF signatures**, and back-fill the existing 135 | No audit trail for the legal basis of payment |
| 4 | Finish **Serutle – Katamelo** (36 unverified) | Second-largest verification gap |
| 5 | Confirm the **211 zero-compensation** PAPs are genuinely zero | 15% of the register carries no value |
| 6 | Add the missing **Serutle – Katamelo** route row | Consistency ahead of the route-approval workflow |

---

*Generated 17 September 2026 from live production data.*
