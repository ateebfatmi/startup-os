# Orbit

Orbit is a spatial startup operating system built around a navigable 3D office. The current milestone delivers the application foundation and an interactive Phase 2 office, while keeping the database and networking layers separate from the render loop.

## What works now

- A premium React Three Fiber office rendered with real 3D geometry, a full-office top-down camera plus an optional isometric follow view, limestone flooring, walnut furniture, smoked-glass rooms, brass details, tailored lighting, shadows, and distinct work zones.
- A persistent office design studio with Founder Atelier, Biophilic Studio, and Midnight Lab directions, signature accent selection, and workspace-level terrace/planting controls.
- Responsive WASD/arrow, click-to-move, and held mobile touch movement with eased velocity, facing direction, office bounds, and furniture collision.
- Contextual project-table, meeting-room, whiteboard, and focus-pod interactions.
- Persistent workspace whiteboard with logical-clock operation merging, realtime multi-user updates, drawing, notes, text, shapes, undo/redo, and PNG export.
- Workspace-scoped 3D furniture placement with server-validated transforms, live previews, persistent Supabase objects, interaction hooks, and collision geometry.
- Self-authored GLTF avatar asset with idle/walk animation clips, persisted jacket color, shared local/remote adapter, and a procedural loading/error fallback.
- Live cross-tab presence and avatar movement through a typed transport layer, with smoothed remote avatars, payload validation, heartbeats, stale-player cleanup, and automatic Supabase Realtime selection when configured.
- Real, permission-gated WebRTC huddles with audio/video tracks, microphone/camera controls, screen sharing, speaking indicators, peer status, directed SDP/ICE signaling, and complete media cleanup.
- Explicitly opt-in proximity audio with deterministic spatial groups, boundary hysteresis, automatic nearby-room transitions, and clear active/off indicators.
- Synced availability states (`available`, `focus`, `do not disturb`, `away`) and deterministic departure delivery across browser tabs.
- Authenticated ICE discovery that can exchange a server-only provider token for short-lived TURN credentials without exposing that token to browsers.
- A responsive app shell, overview, local Kanban workflow, login, and workspace onboarding.
- Production-shaped Supabase Auth flows for registration, email verification callbacks, sign-in, Google OAuth entry, password recovery, protected routes, persistent cookie sessions, and logout.
- Authenticated onboarding that updates the member profile, creates a private workspace through the `create_workspace` RPC, saves workspace type, and persists the selected office template.
- Server-side workspace invitation workflow with raw token generation, SHA-256 token hashing in PostgreSQL, expiration, single-use invitation acceptance page (`/invite/accept`), email validation, and role assignment.
- Workspace member directory and administration UI supporting roles (`owner`, `admin`, `member`, `guest`), server-authorized role updates, member removal, and final-owner protection.
- Multi-workspace membership discovery and switching without signing out.
- Database-backed project portfolio and Kanban task management supporting full CRUD, task comments, member assignment, deadlines, priority filtering (`urgent`, `high`, `medium`, `low`), and project categorization.
- Persistent meeting scheduling with shared notes and linked resources, company objectives, measurable key results, progress tracking, and event-driven personal notifications.
- Executive workspace analytics and a keyboard-accessible command search for navigating every operating surface.
- Owner/admin OAuth connections for Google Calendar, Slack, GitHub, and Linear with signed CSRF state, AES-256-GCM encrypted server-side tokens, automatic token refresh, and idempotent imports into meetings and tasks.
- Owner/admin billing with Stripe Checkout, signed webhook synchronization, seat quantities, subscription status, and customer-portal access.
- Private workspace file library with a 25 MB limit, MIME allowlist, owner/admin deletion rules, and short-lived signed download URLs.
- Immutable activity feed for project, task, comment, file, and membership changes.
- Local demo persistence for projects, tasks, task comments, files, team directory, and invitations when no backend credentials are configured.
- Supabase migrations containing core workspace models, RLS, user bootstrap, atomic workspace creation, and RPC functions for secure invitation acceptance and member management.

The sample people, tasks, and meetings are visibly contained within the **Local demo** workspace. They are not represented as live product data.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without Supabase credentials, `/login` clearly offers a local demo and task changes are saved only in browser storage.

## Supabase setup

1. Create a Supabase project.
2. Apply every SQL file in `supabase/migrations` in filename order with the Supabase CLI or SQL editor.
3. Copy the project URL and anon key into `.env.local`.
4. Add `http://localhost:3000` and the production Vercel origin to the Auth redirect allowlist.
5. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. It is reserved for server-only administrative operations.

### Authentication configuration

- Set the Supabase Auth site URL to `http://localhost:3000` for local development and to the canonical HTTPS origin in production.
- Add both origins to the redirect allowlist. Orbit returns email verification and OAuth responses through `/auth/callback`; password recovery continues from that callback to `/reset-password`.
- Enable the Google provider in Supabase only after configuring its OAuth client and the Supabase callback URL shown by the provider settings.
- When email confirmation is enabled, new users remain on the login screen until they follow the verification link. When disabled, onboarding begins immediately.
- `/office`, `/onboarding`, and `/reset-password` are session-protected whenever public Supabase credentials are configured. Without credentials, they remain available for the explicit local demo.

For calls outside a local network, configure `TURN_CREDENTIALS_URL` and optionally `TURN_CREDENTIALS_TOKEN` so `/api/realtime/ice` can fetch short-lived credentials. Static `NEXT_PUBLIC_ICE_SERVERS` remains the fallback. The current peer mesh is intended for small huddles; larger calls should move to an SFU.

The RLS policies scope data through `workspace_members`. Private rooms additionally check `allowed_roles`. Invitation tokens are modeled as hashes; raw tokens must only be generated and exchanged by server routes.

## Verification

```bash
npm run check
npm run audit:prod
npm run test:e2e
```

The E2E suite starts the dev server and verifies the office shell and local task creation. Install the Playwright Chromium runtime once with `npx playwright install chromium` if it is not present.

## Deployment

Deploy the Next.js app to Vercel and configure the same public Supabase variables there. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin, apply database migrations before the first production deployment, and configure TURN credentials before enabling huddles for external networks. The `/api/health` endpoint reports release identity and backend mode without exposing secrets. Every push and pull request is gated by type checking, linting, unit tests, a production build, a production dependency audit, and Playwright browser tests. See `DEPLOYMENT.md` for the release checklist and rollback procedure.

## Architecture boundaries

- `features/virtual-office`: frame-loop simulation, scene, collision, interaction definitions, and local player store.
- `features/multiplayer`: transport interface, browser and Supabase adapters, validation, rate limiting, presence, and lifecycle handling.
- `features/communication`: permission-gated media capture, WebRTC peer lifecycle, signaling adapters, ICE configuration, and call state.
- `features/workspace`: product shell, Supabase repositories, workspace switching, audit history, and private file library.
- `lib/supabase`: credential-aware database client boundary.
- `supabase/migrations`: persistent schema and authorization.
- `tests`: deterministic movement tests and browser workflows.

See `IMPLEMENTATION_CHECKLIST.md` for completed scope and the next milestone. Authenticated cross-device Supabase verification, production TURN, meeting/notification workflows, and collaborative whiteboard synchronization remain explicit follow-up work.
