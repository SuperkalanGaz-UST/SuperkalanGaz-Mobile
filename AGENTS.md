# AGENTS.md — Superkalan Gaz Centralized CRM

> Guidance for AI coding agents working in this project. Read the **Golden Rules** and
> **Multitenancy** sections before writing any code. This project is a university capstone;
> **panel defensibility is the primary filter for every decision** — never add features,
> practices, or claims outside confirmed scope.

---

## 1. Project Overview

An ITIL 4 value-based, **centralized CRM** for **Superkalan Gaz**, an LPG franchise
distributor. It replaces manual, fragmented operations (phone orders, verbal follow-ups)
with a centralized platform. The core value stream is **order-to-delivery**; the system is
designed to optimize that Service Value System (SVS).

Requirements and acceptance criteria are tracked in **Jira project `SK`**. Treat Jira stories
as the source of truth for behavior; this file governs *how* code is written and *what*
constraints must never be violated.

---

## 2. Repositories

| Repo                   | Stack                     | Purpose                          |
| ---------------------- | ------------------------- | -------------------------------- |
| `superkalan-crm-api`   | NestJS + TypeScript       | Backend, business logic, data    |
| `superkalan-crm-web`   | Next.js (React)           | Internal staff dashboard (SA/FA/BO/BM) |
| `SuperkalanGaz-Mobile` | React Native + Expo      | Customer and **Delivery Rider** mobile app |

Sections below are tagged `[api]`, `[web]`, `[mobile]`, or `[all]` where they apply.

---

## 3. Golden Rules (read first) `[all]`

1. **Branch scoping is mandatory.** Every data access must be filtered by `branch_id`
   according to the caller's role. A missing branch filter is a cross-tenant data leak.
   See §5.
2. **No hard deletes — ever.** Use soft delete (`deleted_at` / status columns). Never emit
   SQL `DELETE` or TypeORM `.remove()` / `.delete()` for domain records.
3. **Stay in scope.** If a request implies anything in §11 (Prohibited / Out of Scope),
   stop and state which boundary it crosses before proceeding.
4. **Use locked terminology only.** See §10. The word **"omnichannel" is banned.**
5. **MVP first.** Ship the simplest robust implementation before proposing extensions.
6. **Don't invent resolutions to open questions.** See §13. If a needed decision is
   unresolved, ask rather than assume.
7. **No hallucinated ITIL practices.** Only the four in §9 are implemented.
8. **Respect repository boundaries.** The parent workspace is only a container—never create
   application code in a root-level `src/`, `app/`, `pages/`, or `api/` directory. Backend,
   web, and mobile files belong only in the repositories listed in §2.

---

## 4. Tech Stack & Architecture `[all]`

- **Backend:** NestJS, TypeScript, TypeORM, PostgreSQL.
- **DB hosting:** Supabase **as managed Postgres only.** Do **not** use the Supabase client
  SDK or PostgREST — it would bypass the branch-scoped JWT guard system. Connect via
  standard Postgres connection + TypeORM.
- **Web:** Next.js (React).
- **Web maps:** **MapLibre GL JS 5.x** is the renderer; **OpenFreeMap** supplies the
  `liberty` style and hosted vector tiles; the geographic data is derived from
  **OpenStreetMap**. These are separate roles: OpenStreetMap is not the renderer or the
  tile host in this stack. Do not introduce Leaflet or request production tiles directly
  from `tile.openstreetmap.org`. The browser loads the OpenFreeMap style/tiles; the NestJS
  API only supplies CRM-owned coordinates/geofences. Geocoding is not currently
  implemented and must be treated as a separate future decision.
- **Mobile:** React Native + Expo (Customer and Delivery Rider role-gated experiences).
- **GPS:** **SinoTrack ST-901** hardware devices → **Traccar** (self-hosted middleware) →
  ingested by the API. These are two distinct things; never conflate them (§10).
- **Edge:** NGINX reverse proxy in front of the API.
- **Architecture style:** **Modular monolith** using NestJS's native module system.
  **No microservices.** RESTful, 3-tier.

---

## 5. Multitenancy & Data Isolation — CRITICAL `[api]`

- Model: **shared-schema multitenancy** with **`branch_id` row scoping**.
- Isolation is enforced **at the application layer** via **NestJS guards reading JWT
  claims** — **NOT** Postgres Row-Level Security and **NOT** physical partitioning.
- **Implication for you:** the database will not stop a cross-branch read. *You* must. Every
  repository/service query for branch-owned data must apply the `branch_id` derived from the
  authenticated principal. Do not trust a `branch_id` sent from the client body/params for
  scoping; derive it from the verified JWT.
- **Do not claim or comment that isolation is "DB-enforced."** It is guard-enforced. Accurate
  comments matter — this is a panel-defense point.

Scoping by role (see §7 for full permissions):
- **SA:** cross-branch governance and audit read visibility (no operational writes).
- **FA:** cross-branch read visibility (no operational writes).
- **BO / BM:** strictly their own `branch_id`.
- **Customer:** their own records only.

---

## 6. Database Conventions `[api]`

- **7 schemas:** `core`, `cim`, `srd`, `fleet`, `loyalty`, `csat`, `inventory` (25 tables).
- **UUID primary keys** everywhere.
- **No foreign-key constraints in the schema.** Referential integrity is enforced in the
  **NestJS service layer**. When writing services, validate referenced records exist and
  belong to the correct branch before persisting.
- **Explicit indexes are required on all reference columns** (every column used as a logical
  FK / lookup). Add the index in the same migration that introduces the column.
- **Soft delete only** (§3.2).
- Migrations are the only way to change schema; do not rely on TypeORM `synchronize`.

---

## 7. Roles & Permissions (RBAC) `[all]`

| Role | Interface | Can do | Must NOT do |
| ---- | --------- | ------ | ----------- |
| **Super Administrator (SA)** | Web | Top-level governance; approve or reject FA-submitted SLA-threshold, price-configuration, Branch Owner-reassignment, and FA-account-creation requests; review immutable price-change, Branch Owner-change, approval, and security activity logs; cross-branch read visibility | Submit or approve their own request; mutate audit history; perform operational writes; process service requests; dispatch; approve redemptions |
| **Franchise Administrator (FA)** | Web | Cross-branch read visibility; submit system-wide SLA-threshold, price-configuration, Branch Owner-reassignment, and FA-account-creation requests for SA approval; perform initial branch and Branch Owner onboarding; manage other branch accounts | Approve governance requests or FA account creation; mutate audit history; perform operational writes; process service requests; dispatch; approve redemptions |
| **Branch Owner (BO)** | Web | Configure **their branch only**: loyalty merchandise catalog, point rates, threshold values *within FA-set bounds*, Dual-Authorization toggle; view branch analytics | Process daily orders; dispatch; cross-branch access |
| **Branch Manager (BM)** | Web | **Day-to-day ops for their branch:** create/process service requests, prepare authorized Delivery Riders for dispatch, offer/dispatch service requests, assign branch vehicles, approve loyalty redemptions | Authorize Delivery Rider identity or branch membership; change SLA thresholds; act outside own branch |
| **Delivery Rider (DR)** | **Web or mobile onboarding; mobile operations** | Accept a Branch Owner invitation through the dedicated registration flow, then use mobile to manage availability after activation, accept or decline assigned service-request offers, and update delivery milestones | Access a web operations dashboard; choose or change authoritative `branch_id`; browse or claim unoffered requests; access another branch or staff governance screens |
| **Customer (CU)** | **Mobile only** | Place orders, track delivery status *milestones*, submit CSAT | Access web dashboard; see live GPS coordinates |

Hard constraints:
- **BO and BM are always separate people.** Do not merge these roles or share a session.
- **SA and FA are governance roles with no operational write actions.** FA proposes
  system-wide SLA-threshold and price-configuration changes, Branch Owner reassignments,
  and FA-account creation; SA makes the approval decision. Initial branch/Branch Owner
  onboarding remains an FA action and must still be audited. Approved changes execute
  through a separately authorized service path and remain attributable in the audit trail.
- **No self-approval.** SA cannot create and approve the same governance request, and FA
  cannot approve FA-account or configuration requests.
- **Audit history is immutable to users.** Price changes, Branch Owner changes, FA account
  creation events, and approval decisions must record actor, action, affected record,
  before/after values where applicable, timestamp, and decision reason.
- **Delivery Rider provisioning is invitation-only.** A Branch Owner supplies the intended
  identity; the API binds a single-use, expiring invitation to the Owner's JWT-derived branch.
- **Delivery Rider web access is registration-only.** The dedicated token-gated web page may
  complete the same invitation flow as mobile, but activation must end with a mobile-app
  handoff and must never expose Delivery Rider operations on web.
- **Invitation acceptance is the authorization.** Only the API writes protected `driver`,
  invitation-bound `branch_id`, and active claims to `app_metadata`. No Branch Manager
  approval or applicant-selected branch is allowed.
- **Customers see delivery status milestones only — never live GPS coordinates.**

---

## 8. Module & Domain Rules `[api] [web] [mobile]`

**5 confirmed modules. There is no Supply Chain module.**

1. **Customer Information Management (CIM)** — profiles, addresses, purchase history.
2. **Service Request & Dispatch (SRD)** — digital order creation, Delivery Rider offer/assignment,
   acceptance, and delivery milestone updates.
   - **Four-timestamp SLA chain (mandatory):**
     `requested_at → dispatched_at → in_transit_at → delivered_at`.
   - SLA breach is measured across **three segments**: request→dispatch,
     dispatch→in-transit, in-transit→delivery.
   - **`order_source` is mandatory on every service request** (`Mobile App` vs
     `Walk-in/Phone`) for channel-level SLA reporting. Never omit it.
   - **Race condition:** re-check `dispatched_at` state at dispatch time to prevent
     double-dispatch (panel-defense requirement).
   - Offering a request does not stamp `dispatched_at`; atomic Delivery Rider acceptance does.
3. **Loyalty Program Monitoring (LPM)** — see §8a. Two **separate** tracks; never merge.
4. **CSAT Feedback & Analytics** — post-delivery star ratings, complaint (Incident) logging,
   average response-time tracking.
5. **Fleet Management** — Delivery Rider roster and vehicle assignment plus GPS via SinoTrack
   ST-901 → Traccar → API. Delivery Riders may register through the invitation-authorized web
   or mobile flow, but use mobile for availability, offer acceptance, and milestones; live
   coordinates still come only from installed hardware
   through Traccar. Hardware-dependent live GPS may be sprint-deferred.

### 8a. Loyalty Program Rules `[api] [web]`

Two entirely separate tracks — **do not share tables/logic that would merge them**:

- **Household track:** points-based; **12-month point expiry**; BO-configurable merchandise
  catalog and point rates *per cylinder size*; redemption-code system; digital ledger.
- **Commercial track:** **30+1 purchase-count model** → free cylinder reward.

Shared workflow:
- **Dual-authorization redemption:** the system flags eligibility; a **Branch Manager
  approves** before any reward dispatches.
- **`Dual Authorization` toggle** lives in **Branch Owner Settings** and controls the BM
  approval gate. **Both ON and OFF code paths must be implemented and covered in
  acceptance criteria.**
- **Re-validate eligibility at BM approval time** (not only at flagging time) — panel-defense
  requirement.

### 8b. Delivery Rider invitation and branch activation `[api] [web] [mobile]`

1. The Branch Owner issues a single-use, expiring invitation bound to the intended identity
   and the Owner's JWT-derived branch.
2. The invitee selects **Register as Delivery Rider** in the dedicated web page or mobile
   flow, verifies the invited email and PH mobile identity, and sets their own password; the
   branch is not editable.
3. The API consumes the invitation, writes protected Delivery Rider role/branch claims, and records
   immutable attribution to the Branch Owner.
4. Web registration ends with a mobile-app handoff. After session refresh, the Delivery Rider
   gets mobile navigation and appears Offline and unassigned. The Branch Manager manages
   vehicle readiness, not membership authorization.

---

## 9. ITIL 4 Mapping `[all]`

Ground designs, model names, and comments in ITIL 4 — but **only these four practices**:

- **Service Request Management** → orders ("Service Requests").
- **Relationship Management** → customer relationships / CIM.
- **Service Level Management** → SLA thresholds and breach measurement.
- **Incident Management** → complaints ("Incidents").

**Do NOT invoke or imply** CMDB, Change Enablement, Problem Management, or Monitoring & Event
Management as practices this system implements. Vocabulary: "Service Request" (order),
"Incident" (complaint), "SLA breach."

---

## 10. Locked Terminology (non-negotiable) `[all]`

- **"Centralized CRM" / "value-based CRM"** — **never "omnichannel."**
- **"Branch Manager"** — never "Branch Head" / "Branch Administrator."
- **"Super Administrator"** — the correct top-level governance role name.
- **"Franchise Administrator"** — the cross-branch administrative role below Super
  Administrator; never shorten it to a generic "Admin" in role labels.
- **"Delivery Rider" / `DR`** — the user-facing delivery-person persona and Story prefix. Existing
  `fleet.riders`, `rider_id`, and `Rider` identifiers are legacy implementation names.
- **SinoTrack ST-901 = hardware device.** **Traccar = self-hosted middleware** that consumes
  SinoTrack data. Never call Traccar the tracker, or vice versa.

---

## 11. Prohibited / Out of Scope `[all]`

Do not write code for, scaffold, or suggest:
- Live corporate **ERP** integration for supply-chain replenishment.
- **HR / payroll**, employee records, **BIR / tax** reporting, or **accounting**.
- Additional ITIL practices beyond the four in §9.
- Any feature outside the 5 modules in §8.

**In scope (do not confuse with the above):** low-stock alerts and reorder *logging* —
configurable thresholds against a **mock JSON supply endpoint**. Only the *live ERP
connection* is excluded, not the alert/logging logic.

If a prompt asks for anything prohibited, **state which boundary it crosses first**, then
propose an in-scope alternative.

---

## 12. Coding Conventions

### `[all]`
- TypeScript strict; no `any` without a written reason.
- Clean, well-commented code. Comments explain *why*, not *what*.
- Group related files into logical directories within the **correct repo**.
- Keep secrets in env vars; never commit credentials.

### `[api]`
- One NestJS module per bounded context aligned to the DB schemas (§6).
- Controllers thin; business rules in services; data access in repositories.
- Enforce branch scoping (§5) and integrity checks (§6) in the service layer.
- DTOs + validation pipes on every endpoint; never trust client input for scoping.

### `[web]`
- App Router (Next.js). Server components for data fetch where sensible.
- Role-gate every screen against §7; the UI must not render actions a role can't perform.
- Talk to the API only; no direct DB access from the web app.

### `[mobile]`
- Expo with separate, role-gated Customer and Delivery Rider navigation. No SA/FA/BO/BM screens.
- Customers see delivery milestones only; Delivery Rider actions do not replace hardware GPS.

---

## 13. Open Decisions — DO NOT ASSUME `[api]`

The shared pricing decision is now resolved: `srd.products` is the system-wide
catalog, and its effective price is snapshotted onto each order at creation.

These remaining items are unresolved. Do not silently pick one; ask or leave a `// DECISION PENDING` marker:

- **`branch_review_log`**: separate entity vs. a status field on the `branches` table.
  (Must be settled before UAT seeding.)
- Some **Section 1.2 operational figures** (order volume, delay minutes, follow-up %) are
  pending client confirmation; do not hardcode invented numbers as if verified.

---

## 14. Build / Test / Run

> **Verify these against the actual `package.json` scripts in each repo** — the commands
> below are conventional defaults, not confirmed. Correct them if they differ.

- `[api]` `npm run start:dev` · `npm run build` · `npm run test` · `npm run test:e2e` · `npm run lint`
- `[web]` `npm run dev` · `npm run build` · `npm run lint`
- `[mobile]` `npx expo start` · `npm run lint`

Before proposing a PR: run lint + relevant tests, and confirm no branch-scoping gaps and no
scope violations (§11).

---

## 15. When Unsure `[all]`

Ask, or leave an explicit `// DECISION PENDING` / `// PANEL-CHECK` comment, rather than
guessing. Prefer the answer that is **defensible to the panel** over the one that is merely
convenient. If a request conflicts with anything in this file, this file wins — surface the
conflict.

---

## 16. Philippine Phone Number Convention `[all]`

Applies to EVERY phone/contact number field in the system:
- Branch contact number (web)
- Branch Owner (web)
- Branch Manager (web)
- Customer (mobile)

**CANONICAL STORAGE** (the only format that hits the database):
E.164 — `+63` followed by the 10-digit subscriber number.
Validation regex: `^\+639\d{9}$` — e.g. `+639171234567`.
Never store spaces, dashes, a doubled `+63`, or a leading `0`.

**DISPLAY / INPUT** (all UIs must match):
Render a FIXED, non-editable `+63` prefix element inside the field border. The user types
only `9XX XXX XXXX`. The `+63` is a prefix element, **NOT** placeholder text (placeholder
text disappears on typing and reintroduces the `0917...` bug).

**NORMALIZATION** — run before validating or storing. Shared logic; copy identically into
web and mobile:

```ts
function normalizePhMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');   // strip +, spaces, dashes
  let n = digits;
  if (n.startsWith('63')) n = n.slice(2);   // full country code pasted
  else if (n.startsWith('0')) n = n.slice(1); // reflexive 0917... entry
  if (!/^9\d{9}$/.test(n)) return null;      // must be 9 + 9 digits
  return '+63' + n;                          // canonical E.164
}
```

Invalid (`null`) → inline error `"Enter a valid PH mobile number"`, block form submission.

**ENFORCEMENT BOUNDARY:**
Frontend normalization is convenience only and is bypassable. The create/update DTOs in
`superkalan-crm-api` MUST independently enforce `@Matches(/^\+639\d{9}$/)` on every phone
field. The DTO is the real integrity boundary — same principle as service-layer referential
integrity (no FK constraints).

**DRIFT NOTE:** this util exists as identical copies in web and mobile. When AGENTS.md is
split per-repo, this convention must be duplicated into each repo's file (or kept in a shared
root file all agents read), not left in only one.
