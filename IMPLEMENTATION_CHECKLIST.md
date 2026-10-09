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
- [ ] Connect onboarding form to `create_workspace` RPC when credentials exist.
- [ ] Complete email verification, recovery, OAuth callback, and protected middleware.
- [ ] Build invitation acceptance and member administration.

## Phase 2 — 3D office

- [x] React Three Fiber scene with real geometry, materials, lights, and shadows.
- [x] Isometric orthographic follow camera.
- [x] WASD and arrow-key movement with acceleration and rotation.
- [x] Office bounds and furniture collision with axis sliding.
- [x] Meeting, project, focus, lounge, and whiteboard zones.
- [x] Contextual interactions that open working product tools.
- [x] Pixel-ratio cap and restrained lighting/shadow cost.
- [ ] Replace capsule avatar with an asset-backed animation adapter.
- [ ] Load saved office layouts and objects from Supabase.
- [ ] Add touch/click-to-move controls.

## Later phases

- [ ] Supabase Realtime presence transport, snapshots, interpolation, and reconnection.
- [ ] WebRTC signaling, TURN configuration, manual calls, then proximity audio.
- [ ] Full project/task/comment/member CRUD through server-authorized repositories.
- [ ] Meeting scheduling, persistent notes/resources, notifications, and activity feed.
- [ ] Collaborative whiteboard CRDT/realtime synchronization.
- [ ] Two-browser multiplayer and media tests, access-control audit, and FPS benchmark.
