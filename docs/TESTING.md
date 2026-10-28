# Testing

| Layer | Command | What it covers |
| --- | --- | --- |
| Types + lint + unit | `npm run check` | TypeScript strict mode, ESLint, 35 Vitest tests: safe Markdown renderer (no raw HTML, link/image filtering), recommendation rules, directory URL state, slugs, Macedonian plurals, date/price formatting, SEO head escaping, YouTube URL parsing |
| Database security | `npm run test:db` | 95 assertions on a throwaway PostgreSQL database with all migrations + seed: RLS, grants, role escalation, editor vs admin, publishing constraints, preview, search, rate limits, newsletter, analytics, video visibility |
| End-to-end | `node tests/e2e/smoke.cjs` | 18 browser steps against the full local stack: consent, search, filters, favorites, wizard, forms, newsletter, 404, mobile menu, admin login, editing, verification, YouTube tutorials, moderation |
| Build | `npm run build` | Production bundle, SSR bundle, pre-rendering of every published page |

## Database tests

`scripts/test-db.sh` needs a **local** PostgreSQL superuser connection (it creates
and drops a database). `supabase/tests/supabase_shim.sql` recreates the parts of the
Supabase platform the migrations use (`anon`/`authenticated` roles, `auth.users`,
`auth.uid()`, `auth.jwt()`), so tests run without Docker or a Supabase account.

```bash
ADMIN_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
```

On a Supabase project you can additionally run the security file in the SQL editor of
a **non-production** project after the seed (it rolls back every block).

## Local full stack

`scripts/local-api.mjs` is a test-only stand-in for the Supabase REST RPC endpoint
and password Auth, running the real SQL functions under `anon`/`authenticated` roles
with RLS. It does not emulate Storage (logo uploads), Edge Functions (YouTube search), e-mail or the dashboard.

```bash
npm run local:db -- --publish-seed   # fresh DB, seed published but unverified
npm run local:api                    # :54321
npm run build && npm run preview     # :4173, with .env.local pointing at :54321
node tests/e2e/smoke.cjs
```

The smoke test writes data (a suggestion, a message, a subscriber, a verified tool):
re-create the local DB before re-running it.

## Manual checks before launch

- Keyboard-only pass through header, filters dialog, wizard and admin forms.
- Screen reader spot check (VoiceOver/NVDA) of a tool page and the wizard.
- Lighthouse on `/`, `/alatki` and a tool page on a mid-range mobile profile.
- Real devices: iOS Safari and Android Chrome at 360–430 px.
- Verified against the production Supabase project: anonymous `select` on `tools`
  returns only published rows; `insert` is rejected.
