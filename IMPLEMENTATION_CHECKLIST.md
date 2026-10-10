# Orbit implementation checklist

## Phase 0 — repository and architecture

- [x] Inspect repository (new, empty workspace).
- [x] Establish a strict TypeScript Next.js App Router project.
- [x] Separate UI, 3D simulation, persistence, and database concerns.
- [x] Document credentials and local setup.

## Phase 1 — foundation

- [x] Branded responsive application shell and navigation.
- [x] Supabase-aware login with explicit local demo fallback.
- [x] Workspace onboarding and office-template selection.
- [x] Initial PostgreSQL schema, indexes, helper functions, and RLS.
- [x] Local-first project/task workflow for credential-free evaluation.
- [x] Connect onboarding and profile setup to `create_workspace` RPC when credentials exist, with a personalized local fallback.
- [x] Complete registration, email verification callback, password recovery, Google OAuth entry, logout, and protected session middleware.
- [x] Build invitation acceptance and member administration workflow (server-side token creation, SHA-256 token hashing, expiration, single-use acceptance, workspace role enforcement, final-owner protection, member directory, and local demo fallbacks).

## Phase 2 — 3D office

- [x] React Three Fiber scene with real geometry, materials, lights, and shadows.
- [x] Isometric orthographic follow camera.
- [x] WASD and arrow-key movement with acceleration and rotation.
- [x] Office bounds and furniture collision with axis sliding.
- [x] Meeting, project, focus, lounge, and whiteboard zones.
- [x] Contextual interactions that open working product tools.
- [x] Pixel-ratio cap and restrained lighting/shadow cost.
- [x] Premium atelier layout with limestone flooring, walnut furniture, smoked-glass rooms, brass detailing, tailored lighting, reception, executive boardroom, focus library, and lounge.
- [x] Collision geometry aligned with premium partitions and reception furniture.
- [ ] Replace capsule avatar with an asset-backed animation adapter.
- [ ] Load saved office layouts and objects from Supabase.
- [ ] Add touch/click-to-move controls.

## Later phases

- [x] Typed multiplayer transport boundary with payload validation and rate-limited snapshots.
- [x] Immediate localhost cross-tab presence with join, leave, heartbeat, and stale-player cleanup.
- [x] Supabase Realtime presence/broadcast transport selected automatically when configured.
- [x] Smoothed remote-avatar interpolation independent of local movement.
- [ ] Verify authenticated Supabase Realtime presence across two separate devices.
- [ ] Add server-side movement validation for a dedicated WebSocket deployment.
- [x] Permission-gated manual WebRTC audio/video huddles for small groups.
- [x] Local and Supabase Realtime signaling adapters with directed SDP/ICE exchange.
- [x] Microphone/camera track controls, participant states, and media cleanup.
- [x] ICE candidate buffering for out-of-order signaling.
- [ ] Configure production TURN credentials and verify calls across restrictive networks.
- [ ] Add speaking indicators, proximity grouping, and automatic proximity audio.
- [ ] Migrate larger group calls from peer mesh to an SFU provider.
- [x] Full project/task/comment/member CRUD through server-authorized repositories, Zod validation, Kanban filters, task assignment, deadlines, and priorities.
- [ ] Meeting scheduling, persistent notes/resources, notifications, and activity feed.
- [ ] Collaborative whiteboard CRDT/realtime synchronization.
- [ ] Two-browser multiplayer and media tests, access-control audit, and FPS benchmark.
