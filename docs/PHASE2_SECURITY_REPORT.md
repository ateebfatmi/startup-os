# Phase 2 security report

## Scope and evidence

Phase 1 SQL regressions established wrong-email and replay denial, final-owner and admin escalation protection, tenant relationship guards, guest task-board restrictions, notification revocation, private topic policy behavior, and atomic objective rollback in disposable PostgreSQL. This is historical local database evidence. Hosted APIs, Storage authorization, Auth issuance, and WebSocket admission remain **BLOCKED**.

Phase 2 added build-time prelaunch validation and a read-only preflight with exact origin/ref matching, a direct database URL and TLS gate, Stripe test-key enforcement, and server-issued TURN credential requirements. Eleven automated targeting tests cover safe setup and rejection cases. Guard output excludes supplied credentials. There are no automatic hosted migration or deployment commands in the repository.

Invitation links previously opened login in sign-in mode even when the link requested signup. Signup and Google sign-in also discarded the requested invitation return path. Login now opens the requested signup mode, and callback URLs preserve the safely encoded local destination. The redirect helper rejects tabs and newlines that can turn a relative-looking path into an external URL after parsing. Hosted email and Google Auth still require verification.

## Open risks and staged attacks

| Priority | Risk | Required evidence |
|---|---|---|
| P0 | Preview env could target a production resource if declared prelaunch identities themselves are wrong | Independently compare Vercel Preview scope, alias, Git branch, Supabase ref and provider accounts. Validate health on the exact origin. |
| P0 | Complete hosted role enforcement is unknown | Use actual owner/admin/member/guest/outsider/anonymous tokens. Execute read and write attempts directly against application and Supabase endpoints. Compare expected and observed access. |
| P0 | Removed members could retain cached data, established Realtime connections or already-issued signed URLs | Remove a synthetic member during a live session. Attempt fresh DB reads and writes, storage signing and object access, new channel admission, and observe established subscriptions. Record URL expiration separately. |
| P1 | Storage metadata and object operations can diverge | Inject failed uploads, failed metadata writes, failed deletions and retries. Verify resulting object and metadata state independently. |
| P1 | Task, meeting-note and design writes can conflict | Exercise concurrent edits, delete-versus-update and workspace switching during an in-flight write. Verify retained data or surfaced conflict. |
| P1 | Session refresh, logout, callbacks and cache boundaries need independent account tests | Test expired tokens, direct protected routes, confirmation/reset links, and same-browser account switching. |
| P2 | TURN issuance and call reconnect could fail on real networks | Inspect actual nominated ICE pair, expiry and reconnect. Record only candidate types and connection states. |
| P4 | Stripe replay and out-of-order events and provider token revocation remain open | Use isolated accounts after approval. Keep signatures, raw state, tokens and payload contents out of test evidence. |

The migration preflight rejects host and TLS mismatches. It does not sign off on grants, existing data, or applied migration history. Use the dashboard and target-side read-only inspection before requesting migration approval.
