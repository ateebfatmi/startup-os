# Phase 1: Workspace Data Unification

## Audit findings and implementation

Previously, the office shell/overview/Copilot used `orbit-demo-tasks`, while Kanban used a separate repository. The office project dialog hardcoded the demo workspace, and demo repository reads treated that workspace as a wildcard. Kanban retained its own snapshot and could display a late response from a previous workspace.

All task surfaces now use `project-service.ts` as the persistence boundary and a TanStack Query snapshot keyed by workspace ID. Authenticated reads and writes continue through the existing session-bound Supabase client and existing RLS. There are no new service-role paths or public realtime channels.

| Files | Changes |
| --- | --- |
| `workspace-data-provider.tsx`, `workspace-record-events.ts` | Shared task/project snapshot, workspace-specific invalidation, focus/5-second polling refresh, storage-event refresh for demo tabs, cleanup on workspace departure. |
| `use-workspace-data.ts`, `workspace-task-adapter.ts` | Replace the old local-only shell store with presentation adapters over canonical records; persist reviewed AI suggestions through the normal task repository. |
| `workspace-shell.tsx` | Wait for authenticated workspace membership discovery; redirect users without workspaces to onboarding; key the full workspace UI by selected ID; reset dialogs, drafts, scene objects and remote players; remove hardcoded project-board routing. Overview project/task metrics now derive from shared records, and completion persists. Add an office task-board shortcut. |
| `kanban-view.tsx`, `projects-view.tsx` | Consume shared queries instead of independent record arrays. Workspace IDs for writes come from the provider. |
| `ai-assistant-panel.tsx` | Await each reviewed task save, prevent concurrent submission, report failures, retain unsaved suggestions, count only successful saves, and stop starting additional writes after unmount. Limit AI context to the API's existing 100-task cap. |
| `project-service.ts` | Enforce strict workspace matching for local reads/updates/deletes; reject local cross-workspace project references; notify cache after successful mutations; use UUIDs for local task/project IDs. |
| `member-service.ts`, `activity-service.ts` | Scope demo member/invitation/activity reads and member mutations to their workspace, including final-owner counts. |
| `workspace-service.ts`, `app/onboarding/page.tsx` | Persist/discover distinct local demo workspaces so onboarding and workspace switching exercise isolation too. Production membership discovery is unchanged. |
| `sample-data.ts`, `legacy-task-migration.ts` | Remove the duplicate shell seed array. Keep presentation types and import legacy demo-only tasks into the canonical local repository. |
| `app/api/workspace/invitations/accept/route.ts` | Centralize explicit demo fallback identity in `DEMO_WORKSPACE`; production acceptance is unchanged. |

The one intentional demo workspace ID remains in `DEMO_WORKSPACE`. Sample fixtures and demo fallback responses refer to that constant. No active task surface substitutes the demo ID for the selected workspace.

## Migrations and data safety

- No SQL migration, schema change, auth-policy change, or RLS change is required or applied.
- Local-only migration: once per browser profile, merge valid missing legacy `orbit-demo-tasks` rows into `orbit-demo-tasks-v2`, then set `orbit-demo-tasks-migrated-v3`.
- Legacy rows have no workspace identity, so they belong only to the original demo. They are never imported into an authenticated workspace or a newly created demo workspace.
- Existing canonical IDs win collisions; legacy storage is retained. Relative legacy deadlines remain contextual text rather than guessed dates.
- No deployment, remote database write, provider connection, or production-data operation was performed.
- The pre-existing `package-lock.json` working-tree modification was left untouched.

## Regression coverage

- `workspace-data.test.ts`: canonical Copilot-to-Kanban repository, strict workspace reads/writes, cross-workspace project rejection, delayed-query isolation, fresh-cache reloads, invalidation scopes, legacy migration, and demo directory/activity isolation.
- `workspace-auth.test.ts`: cross-user shared persistence, unauthenticated creation rejection, non-member RLS error propagation, and authenticated Copilot writes. Uses a session-bound Supabase contract double, not a real database.
- `tests/security/task-route.test.ts`: anonymous HTTP creation rejection, RLS error propagation, and author identity taken from the authenticated session.
- `tests/e2e/workspace-data.spec.ts`: Copilot → Kanban → refresh → overview → office board; workspace switch/draft reset/isolation; shared-tab save visibility and reload; one-time demo migration; partial-save failure/retry without duplicate successful tasks.

## Verification

- `npm run check`: PASS on the final source revision. Includes TypeScript checking, ESLint (no warnings/errors), all 65 unit/security tests across 16 files, and the optimized Next.js production build.
- Full existing + Phase 1 browser run: 30/30 passed in 1.2 minutes.
- Final Phase 1 browser run after adding the partial-failure regression: 5/5 passed in 18.7 seconds. Together the runs cover 31 distinct browser tests; the complete 31-test suite was not rerun as a single invocation.
- Browser command: `npx playwright test --config=/private/tmp/orbit-phase1.playwright.config.ts` (full run), then the same command with `workspace-data.spec.ts` (final targeted run).
- Browser configuration reused the repository Playwright configuration and the installed Google Chrome executable because a bundled Playwright Chromium runtime was absent. The temporary override did not change repository test configuration. Browser runs used the local Next.js development server; the optimized production build was checked separately.
- The first targeted browser attempt exposed a test-selector error: the shared task count changes the accessible button name from `My tasks` to `My tasks 2`. The selector now matches the label prefix; subsequent full and targeted runs passed.
- `git diff --check`: PASS.
- Existing toolchain notices remain: Next.js's deprecated `next lint`, Vite's CJS API notice, and Supabase's warning about Node.js 20 and below. These did not fail any check. No package upgrades were performed.

## Remaining risks and boundaries

1. Live cross-account persistence and deployed RLS were not exercised. Unit tests verify the auth/client contract and errors; browser tests use explicit local demo mode. A non-production Supabase integration run with separate real users remains necessary before launch.
2. Remote task changes become visible through polling (nominally 5 seconds in an active tab), focus refresh, and explicit refresh. This phase does not add realtime task subscriptions or offline mutation queues.
3. Multi-task Copilot creation is sequential, not atomic. Successful tasks remain saved when a later task fails; unsaved suggestions can be selected and retried. A network response lost after a committed database insert can still produce an ambiguous result because server-side creation idempotency is not implemented.
4. Demo localStorage is browser-local and not transactional across simultaneous tabs. It is not a replacement for cross-user database persistence.
5. Unknown AI project names and relative deadlines are retained in task descriptions. Only an existing project in the current workspace and a valid ISO calendar date become structured fields.
6. Realtime channel authorization and billing reliability from the broader audit remain separate workstreams; this phase preserves their existing behavior.
