# Phase 2 environment audit

The checkout includes the uncommitted Phase 1 stabilization on base revision `632a083`. There is no workspace `.vercel` linkage or `.env.local`. Read-only Vercel searches for CrewVilla and startup-os found no matching projects in the connected scope. No approved prelaunch Vercel project, Supabase ref, test account, provider account, or physical-device session was supplied.

The protected Preview and eventual public release use the same two projects. Preview credentials target the eventual launch database, so unapproved Preview builds and automated fixture writes must remain disabled.

## Architecture and trust boundaries

| Surface | Current implementation and prelaunch risk |
|---|---|
| Next.js and Vercel | Node 24 CI builds the App Router application. Supabase public settings are embedded at build time. Server credentials are configured at runtime. A Preview can still receive production credentials from its environment scope. |
| Supabase Auth | Browser and cookie-aware server clients use the public key. Middleware validates protected page sessions. Auth callbacks exchange a code for a session. Canonical URL configuration is critical because the existing fallback prefers Vercel's production hostname. |
| Database | Authenticated sessions use PostgreSQL RLS and guarded RPCs. Membership, project and task policies are in forward migrations. The service-role client can bypass RLS and is used for privileged billing/integration persistence. |
| Storage | Private `workspace-files` bucket, workspace/user/object path, MIME and size restrictions, short-lived signed downloads. Storage and metadata writes have independent failure modes. A signed URL already issued can outlive membership until expiry. |
| Realtime | Private workspace, call and whiteboard topics use membership policies. Verify admission and revocation against the deployed Realtime service. Disable public channels on dedicated prelaunch after approval. Existing sockets may outlive database membership changes. |
| WebRTC | Supabase broadcasts signal the peer mesh. ICE discovery calls an optional server-side issuer and falls back to configured STUN. Issuer configuration alone gives no evidence of a selected TURN relay. Session-gated issuance still needs quota and expiry verification. |
| OAuth | Google Auth and workspace integrations have separate callback chains. Integration state is signed and token data encrypted. Provider HTTP endpoints are hardcoded provider endpoints. No hardcoded CrewVilla production domain was found in the inspected connection and callback code. |
| Stripe | Checkout and portal use server-only credentials. Signed events update Supabase with a privileged client. Sandbox credentials, prices, webhook endpoint, and signing secret must all come from the same test environment. |
| Gemini | Server-side key enables real generation. Fallback is available locally. Verify model availability, egress, quotas, and visible failure/fallback behavior with prelaunch-only inputs. |
| Testing | Existing GitHub Actions uses Node 24 and a localhost build for Playwright. Demo tests use browser storage, same-origin channels and synthetic media. Disposable SQL tests use PostgreSQL and schema stubs. Neither executes the hosted role matrix. |

## Configuration inventory

| Variables | Prelaunch expectation |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Exact canonical HTTPS prelaunch origin. Public and build-time. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dedicated prelaunch Supabase HTTPS origin and matching publishable or legacy anon key. Public and build-time. |
| `CREWVILLA_PRELAUNCH`, `CREWVILLA_PRELAUNCH_ORIGIN`, `CREWVILLA_PRELAUNCH_SUPABASE_REF` | Explicit prelaunch mode, approved origin and ref. Configure in Preview only. The ref is public project identity. |
| `CREWVILLA_PRELAUNCH_DATABASE_URL` | Local operator secret for migration preflight only. Direct project host, port 5432, and verified TLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, optional until approved billing or integration testing. The guard accepts a matching legacy service-role JWT for prelaunch. |
| `NEXT_PUBLIC_ICE_SERVERS`, `TURN_CREDENTIALS_URL`, `TURN_CREDENTIALS_TOKEN` | Public STUN bootstrap. Short-lived TURN values come from a dedicated server-side issuer. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` | Optional server-only, all from the approved Stripe test environment. |
| `INTEGRATION_ENCRYPTION_KEY`, `INTEGRATION_STATE_SECRET` | Optional server-only, distinct prelaunch secrets. Encryption key is 32 bytes encoded as base64. |
| `GOOGLE_CALENDAR_CLIENT_ID/SECRET`, `SLACK_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`, `LINEAR_CLIENT_ID/SECRET`, `SPOTIFY_CLIENT_ID/SECRET` | Optional separate prelaunch provider applications. Configure actual `_CLIENT_ID` and `_CLIENT_SECRET` variables from the template. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional server-only key and model override. Verify the configured model with test requests after approval. |

None of the dedicated prelaunch values have been verified. The guard cross-checks configuration, JWT claims, and target URL syntax. It cannot establish ownership, verify a publishable key's project offline, inspect Vercel aliases, or validate provider account identity. Compare dashboard identities and effective environment scopes before every hosted operation.
