# AI KATALOG

Macedonian-language AI discovery platform: a catalogue of AI tools with verified
pricing and features, structured comparisons, tutorials, editorial lists, a
rule-based recommendation wizard and a protected CMS.

**Stack:** React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · React Router 8 (data mode,
build-time pre-rendering) · Supabase (PostgreSQL, Auth, Storage, Row Level Security) · Lucide.

| Document | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Rendering model, data flow, database schema, security model |
| [docs/SETUP.md](docs/SETUP.md) | Supabase setup, migrations, first admin account, environment variables |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel / Netlify deployment, rebuild on publish, advertising |
| [docs/TESTING.md](docs/TESTING.md) | Unit, database security and end-to-end tests, local stack |
| [docs/YOUTUBE.md](docs/YOUTUBE.md) | YouTube tutorials per tool, optional YouTube Data API setup |
| [docs/STATUS.md](docs/STATUS.md) | What is implemented, what is deferred, launch checklist |

## Quick start (local, no Supabase account needed)

Requires Node 22+ and a local PostgreSQL 15+ superuser connection.

```bash
npm install
npm run local:db -- --publish-seed   # throwaway DB with migrations + seed (+ test accounts)
npm run local:api                    # local stand-in for Supabase RPC + Auth on :54321 (testing only)

# in another terminal
cp .env.example .env.local           # then set:
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=local-anon-key
# VITE_SITE_URL=http://localhost:4173
npm run dev                          # http://localhost:5173
```

Local admin accounts (local database only): `admin@local.test` / `local-admin`,
`editor@local.test` / `local-editor` → `/admin`.

`--publish-seed` publishes the *unverified* starter content so the interface can
be exercised. In a real project all starter tools and guides stay in the review
queue until an editor checks them against official sources.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (client-side rendering) |
| `npm run build` | Client build → SSR bundle → pre-render pages, sitemap, robots.txt |
| `npm run preview` | Serve `dist/` locally |
| `npm run check` | Type check + ESLint + unit tests |
| `npm run test:db` | Apply migrations to a throwaway database and run the RLS/API security tests |
| `node tests/e2e/smoke.cjs` | Browser smoke test against a running local stack |

## Content principles enforced in code

- Public pages only read `published` records (RLS + explicit filters).
- Prices and free-plan facts are shown as facts only after an editor marks the tool *verified*; otherwise the UI says „непроверено“.
- Unknown data is labelled as unknown and never earns points in the recommendation wizard.
- Sponsored placements are always labelled and never affect rankings.
- No ratings, review counts, testimonials or popularity numbers are displayed.
