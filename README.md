# Orbit

Orbit is a spatial startup operating system built around a navigable 3D office. The current milestone delivers the application foundation and an interactive Phase 2 office, while keeping the database and networking layers separate from the render loop.

## What works now

- A React Three Fiber office rendered with real 3D geometry, an orthographic isometric camera, lighting, shadows, furniture, and rooms.
- Responsive WASD/arrow movement, eased velocity, facing direction, office bounds, and furniture collision.
- Contextual project-table, meeting-room, whiteboard, and focus-pod interactions.
- Live cross-tab presence and avatar movement through a typed transport layer, with smoothed remote avatars, payload validation, heartbeats, stale-player cleanup, and automatic Supabase Realtime selection when configured.
- Real, permission-gated WebRTC huddles with audio/video tracks, microphone and camera controls, peer status, directed SDP/ICE signaling, and complete media cleanup.
- A responsive app shell, overview, local Kanban workflow, login, and workspace onboarding.
- Local demo persistence for tasks when no backend credentials are configured.
- A Supabase migration containing core workspace models, indexes, RLS, user bootstrap, and atomic workspace creation.

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
2. Apply `supabase/migrations/202610090001_initial_schema.sql` with the Supabase CLI or SQL editor.
3. Copy the project URL and anon key into `.env.local`.
4. Add `http://localhost:3000` and the production Vercel origin to the Auth redirect allowlist.
5. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. It is reserved for server-only administrative operations.

For calls outside a local network, set `NEXT_PUBLIC_ICE_SERVERS` to a JSON array containing your STUN and TURN configuration. Prefer short-lived TURN credentials issued by a server-side endpoint. The current peer mesh is intended for small huddles; larger calls should move to an SFU.

The RLS policies scope data through `workspace_members`. Private rooms additionally check `allowed_roles`. Invitation tokens are modeled as hashes; raw tokens must only be generated and exchanged by server routes.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The E2E suite starts the dev server and verifies the office shell and local task creation. Install the Playwright Chromium runtime once with `npx playwright install chromium` if it is not present.

## Deployment

Deploy the Next.js app to Vercel and configure the same public Supabase variables there. Apply database migrations before the first production deployment. A future dedicated multiplayer service should use its own deployment and validate workspace membership on the server before accepting movement or interaction traffic.

## Architecture boundaries

- `features/virtual-office`: frame-loop simulation, scene, collision, interaction definitions, and local player store.
- `features/multiplayer`: transport interface, browser and Supabase adapters, validation, rate limiting, presence, and lifecycle handling.
- `features/communication`: permission-gated media capture, WebRTC peer lifecycle, signaling adapters, ICE configuration, and call state.
- `features/workspace`: product shell and temporary local data adapter.
- `lib/supabase`: credential-aware database client boundary.
- `supabase/migrations`: persistent schema and authorization.
- `tests`: deterministic movement tests and browser workflows.

See `IMPLEMENTATION_CHECKLIST.md` for completed scope and the next milestone. Multiplayer, real media, and collaborative whiteboard synchronization are not claimed as complete in this milestone.
