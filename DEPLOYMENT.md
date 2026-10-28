# Orbit production deployment

## Required platform settings

- Use Node.js 20 or newer.
- Deploy from the protected `main` branch with preview deployments enabled for pull requests.
- Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` together. Leaving both unset intentionally enables demo mode; configuring only one fails the build.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it through a `NEXT_PUBLIC_` variable.
- Configure `NEXT_PUBLIC_ICE_SERVERS` as a JSON array with production STUN and TURN servers. Use short-lived TURN credentials when possible.
- Prefer `TURN_CREDENTIALS_URL` plus the server-only `TURN_CREDENTIALS_TOKEN` for ephemeral credentials; retain `NEXT_PUBLIC_ICE_SERVERS` as a fallback.

## Backend preparation

1. Apply every file in `supabase/migrations` in filename order.
2. Configure the Supabase Auth site URL and redirect allowlist for `/auth/callback` and `/reset-password`.
3. Enable the intended OAuth providers and verify their provider-side callback URLs.
4. Test RLS with an owner, member, guest, and a user outside the workspace.

## Release gate

```bash
npm ci
npm run check
npm run audit:prod
npm run test:e2e
```

After deployment, verify:

- `GET /api/health` returns `status: ok` and the expected database mode.
- Login, OAuth callback, onboarding, invitation acceptance, and logout work on the canonical origin.
- A project, task, comment, invitation, and member-role update persist after refresh.
- Two authenticated browsers see presence updates.
- A huddle connects through TURN from two separate networks.
- Browser console and platform logs contain no secrets or unhandled errors.

## Rollback

Promote the last known-good immutable deployment, then verify `/api/health`. Database migrations must be backward compatible; ship destructive schema cleanup only after the previous application version is no longer eligible for rollback.
