# Phase 2 test matrix

A blocked row has no hosted result. Record each role/action combination separately when executed. Evidence must contain no cookies, invitation tokens, signed URLs, credentials or private content. Fix commits are pending until changes are committed.

| ID | Feature / environment | Roles | Expected result | Actual / status | Evidence | Fix / retest |
|---|---|---|---|---|---|---|
| L01 | Node 24 local typecheck, lint, build and unit suite | N/A | All checks pass | 83 unit/security tests passed in 19 files. Typecheck and lint passed after the single-project update. Optimized build passed in the prior run | `npm run check`, Vitest output | Uncommitted guard and Auth fixes; 12 additional tests passed |
| L02 | Local Chromium production build | Demo roles | 31 scenarios pass | Phase 2 frozen run **31/31 PASS** before the Auth fix. Final Auth/invitation focused rerun **4/4 PASS**, including one new scenario | Playwright. The initial shared-directory build failed before tests. Frozen builds use separate directories | Auth signup regression passed |
| L03 | Production dependency audit | N/A | No high/critical vulnerabilities | Phase 2 PASS, 0 vulnerabilities | `npm run audit:prod` | — |
| DB01 | Disposable PostgreSQL migration chain and RLS regressions | Owner, admin, member, guest, outsider, anon | Guards reject invalid access and partial writes | Phase 2 rollback-only regression PASS on Phase 1 disposable PostgreSQL with stubbed Supabase schemas | `tests/security/workspace-membership.sql` | Hosted retest blocked |
| L04 | Guarded prelaunch browser runner discovery | N/A | Test discoverable with dummy configuration; missing prelaunch mode rejected | PASS locally. Zero hosted assertions executed | Playwright `--list` and preflight rejection | Hosted test blocked |
| S01 | Prelaunch identity, effective configuration, migration preflight, health and rollback | Operator | Exact dedicated project, Preview alias and migration history | BLOCKED | No approved target | — |
| A01 | Signup, email confirmation, login, reset, logout and session refresh | A/B/anon | Secure redirect and session lifecycle with no previous-account data | BLOCKED | Test inbox and accounts needed | — |
| A02 | Invalid credentials, expired session and protected endpoints | Anonymous/expired | No private read or write | BLOCKED | No hosted Auth | — |
| A03 | Google Auth provider | Test Google identity | Callback returns to exact prelaunch origin | BLOCKED | Provider setup needed | — |
| I01 | Onboarding, owner assignment and new-session invitation | Owner and invitee | Correct workspace and role | BLOCKED | No prelaunch fixtures | — |
| I02 | Wrong email, invalid, expired and replayed invite | Invitee/outsider | Denial and no membership mutation | BLOCKED | Local SQL evidence only | — |
| R01 | Workspace read/settings and membership invite/change/remove | Owner/admin/member/guest/outsider/anon | Reads restricted to membership, settings and member management restricted to authorized roles, last owner protected | BLOCKED | Execute each action directly using all six roles | — |
| R02 | Project create/update/delete and task create/assign/update/delete/comments | Same six roles | Contributors write within own workspace. Guests read. Outsiders and anonymous denied | BLOCKED | Direct PostgREST and route responses required | — |
| R03 | Guessed workspace ID, outsider assignee, cross-workspace project and removed user | Member/outsider/removed member | RLS and guards deny each invalid access | BLOCKED | Capture DB/API response and unchanged state | — |
| R04 | Files read/upload/download/delete and meeting read/write | Same six roles | Workspace boundaries and intended per-action permissions hold | BLOCKED | Audit guest policy against documented product permissions | — |
| R05 | Private presence, board and call topic admission | Same six roles | Only current members can join intended topics | BLOCKED | Supabase WebSocket evidence required | — |
| D01 | Workspace settings, projects, tasks, Kanban, comments, goals, key results | A/B | Persist after reload and fresh login. Second session sees authorized changes | BLOCKED | Database and UI checks per feature | — |
| D02 | Meetings, notes, activity, notifications, files, board, design and furniture | A/B | Persist and remain workspace-scoped after fresh login | BLOCKED | Database, Storage and browser evidence | — |
| D03 | Parallel edits, stale edit after delete, switching during write, revocation | A/B/removed | Correct convergence or surfaced conflict. No stale workspace state | BLOCKED | Capture actual persisted record and both UIs | — |
| F01 | File limits, interruption, orphan metadata and retry | A/B/outsider | Rejections and recovery, no direct outsider access by known object key | BLOCKED | Storage request results and fixture reconciliation | — |
| RT01 | Avatar movement, navigation, stale presence and reconnect | A/B/C | Only authorized peers visible. Stale peers clear | BLOCKED | Independent sessions and disconnect/reconnect timeline | — |
| RT02 | Concurrent board edits, missed updates and task propagation | A/B | Reload retains board edits. Tasks converge according to polling design | BLOCKED | Two contexts and persisted data | — |
| RTC01 | Real media, controls, permission denial, screen share and cleanup | A/B | Two-way audio/video, accurate error state, tracks released | BLOCKED | Two physical devices and real media | — |
| RTC02 | Different networks, relay-only and network recovery | A/B | Selected relay pair and successful reconnect | BLOCKED | TURN issuer and two networks | — |
| UX01 | Navigation, keyboard/focus, mobile, slow/offline, errors and empty states | A/B/guest | Usable existing workflows and explicit feedback | NOT RUN | Manual supported browser/device matrix | — |
| PERF01 | 3D load, frame stability, memory and main-thread blocking | A/B | Collect actual measurements and reproduce bottlenecks | NOT RUN | Physical hardware and traces needed | — |
| P01 | Gemini real generation, failure and fallback | Test workspace | Prelaunch provider works and fallback labeled | BLOCKED | Isolated provider configuration | — |
| P02 | Stripe test checkout/cancel/webhook/duplicate/portal/entitlements | Owner/admin | Only sandbox activity; persisted state matches event | BLOCKED | Stripe test mode and authorized webhook target | — |
| P03 | Calendar, Slack, GitHub and Linear OAuth/import/revoke | Owner/admin | Expected scoped OAuth flow and provider-specific behavior | BLOCKED | Separate approved provider apps | — |
| P04 | Spotify OAuth and current playback check | Owner/admin | Account connects and playback check is accurate | BLOCKED | Approved Spotify test account | — |
