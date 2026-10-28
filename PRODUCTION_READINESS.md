# Orbit production readiness

## Current status

The application code is release-ready for a small-team production deployment. The repository has strict TypeScript, linting, a production build, automated access-control checks, dependency auditing, local fallbacks, backward-compatible migrations, rollback guidance, and end-to-end coverage for the critical product journeys.

Production deployment is not complete until the environment-specific gates below are exercised with real provider credentials and physical networks. Passing local or headless tests cannot substitute for those checks.

## Verified in this revision

- `npm run check`: type checking, lint, 43 unit/security tests, and optimized Next.js build passed.
- `npm run audit:prod`: 0 production dependency vulnerabilities.
- `npm run test:e2e`: 23 Chromium workflows passed, including two-tab presence, proximity audio, WebRTC media, whiteboard merging, persistence, and 3D interactions.
- Every public application table is covered by an automated RLS regression audit.
- Privileged billing and integration routes are checked for authentication, membership, and owner/admin enforcement.
- The premium scene records its render-loop FPS. Hardware automation targets more than 45 FPS; software WebGL is detected and automatically uses reduced rendering.
- The `main` branch is synchronized with GitHub after every verified upgrade stage.

## Required before first public launch

1. Create production Supabase and apply all migrations in filename order.
2. Test owner, admin, member, guest, and non-member access against the deployed database.
3. Verify presence and whiteboard updates between two authenticated users on separate physical devices.
4. Configure short-lived TURN credentials and complete a huddle from two restrictive, separate networks.
5. Complete Stripe test-mode Checkout, signed webhook, subscription update, and customer-portal return flows.
6. Register exact OAuth callbacks for Google Calendar, Slack, GitHub, and Linear; connect test accounts and run each manual sync.
7. Validate `/api/health`, canonical HTTPS redirects, log redaction, monitoring, backups, and rollback on the production host.

## Scale boundary

- Current multiplayer: validated client snapshots over Supabase Realtime, suited to small offices.
- Current media: peer mesh with TURN support, suited to small huddles.
- Before higher concurrency: deploy server-authoritative movement validation and load-test it.
- Before large calls: configure an SFU provider and test reconnect, moderation, screen share, and network degradation.

These are explicit capacity gates, not hidden claims about the current release.
