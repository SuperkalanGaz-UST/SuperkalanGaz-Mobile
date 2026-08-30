# Delivery Rider Registration and Branch Reflection

## Scope and terminology

**Delivery Rider (`DR`)** is the user-facing persona. Existing `fleet.riders`, `rider_id`,
and `Rider` identifiers remain compatible implementation names. The Delivery Rider mobile
workflow is part of Service Request & Dispatch and Fleet
Management; it does not replace the SinoTrack ST-901 → Traccar GPS path.

## Primary user journey

1. **Branch Owner authorizes membership.** In the web dashboard, the Branch Owner enters
   the intended Delivery Rider's verified name, email, and PH mobile number. The NestJS API
   creates a single-use, expiring invitation bound to the Owner's JWT-derived branch.
2. **Choose the Delivery Rider path.** A phone with the installed app opens the mobile
   registration flow. A laptop or device without the app opens the dedicated token-gated
   web registration page. There is no public signup or branch picker.
3. **Create and verify the account.** The invitee opens the single-use email link and sets
   their own password in either registration client. The Branch Owner never knows it.
4. **Verify the invited identity.** The invitee confirms their PH mobile number. The field
   displays a fixed `+63` prefix and submits only canonical `+639XXXXXXXXX` format. Verified
   email and phone values must match the invitation.
5. **Validate the invitation.** The API rejects an expired, revoked, used, replayed, or
   identity-mismatched invitation without revealing branch data. The invitation's branch is
   displayed but cannot be selected or edited in either registration client.
6. **Activate safely.** Successful acceptance consumes the invitation and causes the API to
   set `role: driver`, the invitation-bound `branch_id`, and active status in protected
   `app_metadata`. Acceptance is the Owner's authorization; no Branch Manager approval is
   added. Immutable history records the Owner, Delivery Rider, branch, and acceptance.
7. **Enter the branch roster.** Web registration ends by directing the Delivery Rider to
   sign in to the mobile app. After mobile session refresh, the Delivery Rider lands on
   their role-gated navigation and initially appears in that branch's Fleet roster as
   **Offline** and **No vehicle assigned**. Invitation acceptance
   does not automatically create, transfer, or assign a vehicle.
8. **Become dispatch-ready.** The Branch Manager assigns one registered, healthy branch
   vehicle. The Delivery Rider sets **Available** in mobile. Only an activated Delivery Rider with a
   valid same-branch vehicle assignment can receive an order offer.
9. **Accept an order offer.** The Branch Manager offers a pending Service Request to that
    Delivery Rider. They see only the specifically assigned offer and may accept or decline.
    Acceptance is atomic: the API rechecks the request and Delivery Rider, stamps `dispatched_at`,
    and changes the Delivery Rider to **On Delivery**. A rejection or expired offer leaves the
    request undispatched for reassignment.
10. **Update delivery milestones.** The Delivery Rider records **In Transit** and **Delivered** from
    the app. These actions stamp `in_transit_at` and `delivered_at`; delivery returns the
    Delivery Rider to **Available** when the assigned vehicle is not maintenance-blocked.

## What the Branch Manager sees

| Delivery Rider event | Fleet Management effect | Vehicle Management effect |
| --- | --- | --- |
| Branch Owner invitation sent | Pending invitations +1; not counted in Total Delivery Riders | No change |
| Invitation accepted | Total Delivery Riders +1; roster row appears as Offline | No automatic vehicle creation or assignment |
| Vehicle assigned | Roster shows the branch vehicle and readiness | Existing vehicle shows the assigned Delivery Rider |
| Delivery Rider goes Available | Delivery Rider becomes dispatch-eligible and counts in Active Now | Vehicle must still be Healthy |
| Offer accepted | Status becomes On Delivery; activity log records acceptance | Assigned vehicle is shown as in use |
| Delivery Rider leaves geofence | Alert is derived from SinoTrack ST-901 data received through Traccar | Vehicle remains the tracked asset |
| Delivery completed | Activity and SLA timestamps update; Delivery Rider returns to Available if eligible | Vehicle becomes available for its next assignment |
| Delivery Rider deactivated | Delivery Rider is removed from the assignable pool but retained in history | Vehicle is unassigned by an explicit Branch Manager action |

For the current Fleet screen, standardize the user-facing labels to **Total Delivery Riders**,
**Delivery Rider Roster**, and **Delivery Rider**. Add a **Pending Invitations** count or
tab; unaccepted invitations must not inflate Total Delivery Riders or appear in the dispatch
selector. **Active Now** counts activated Delivery Riders who are currently Available or On
Delivery. **Outside Geofence** and **Past Curfew** remain vehicle-hardware-derived metrics,
associated with a Delivery Rider only through
the active same-branch vehicle assignment.

## Rejection and recovery paths

- **Expired, revoked, or mismatched invitation:** deny registration and issue no Delivery Rider role
  or branch claims; only the Branch Owner can send a replacement invitation.
- **Wrong branch:** the invitee cannot select a branch. A correction requires the Owner to
  revoke the original invitation and create a new branch-bound invitation.
- **Duplicate identity or phone:** block the duplicate and direct the Branch Owner to the
  existing profile; do not create parallel active Delivery Rider records.
- **Branch or API unavailable:** keep the invitation unconsumed and show retry; never
  fabricate activation, roster membership, or vehicle assignment.
- **Deactivated:** revoke Delivery Rider operational access through a soft status change and
  preserve invitation, delivery, and audit history.

## Acceptance rules to carry into Jira

- Only the branch's Branch Owner can issue, resend, or revoke Delivery Rider invitations.
- Uninvited or unactivated identities cannot access Delivery Rider operational endpoints.
- The API, never either client, assigns protected Delivery Rider role and branch claims.
- Every Delivery Rider query and mutation is scoped by the JWT-derived `branch_id`.
- Invitation acceptance does not create or assign a vehicle.
- Phone input and API validation follow the project-wide Philippine mobile convention.
- Order acceptance is concurrency-safe and cannot double-dispatch a Service Request.
- Delivery Rider mobile actions never become the source of live GPS coordinates.
