# Architecture

## Rendering model

AI KATALOG is a React Router *data mode* application rendered in two ways:

1. **Build-time pre-rendering (SEO).** `npm run build` builds the client, builds
   `src/entry-server.tsx` as an SSR bundle, then `scripts/prerender.mjs` runs every
   public route through `createStaticHandler` + `StaticRouterProvider`. Each page is
   written as static HTML with its `<title>`, description, canonical URL, Open Graph
   tags, JSON-LD and the router hydration data. Search engines receive full content
   without executing JavaScript. The list of pages comes from `api_sitemap()`, so only
   published, non-empty pages are rendered and listed in `sitemap.xml`.
2. **Client navigation.** The browser hydrates the pre-rendered page and then runs
   route loaders on navigation. If a build is older than 10 minutes the visible page
   is re-validated in the background so prices and statuses are never stale.

Pages that did not exist at build time (e.g. a tool published an hour ago) are served
through the `/_spa.html` fallback and rendered on the client; they become static HTML
on the next build. Trigger a rebuild on publish with a deploy hook (see DEPLOYMENT.md).

Filtered directory URLs (`/alatki?cena=free`) are rendered on the client and marked
`noindex, follow` to avoid thin, indexable filter combinations.

## Data access

- **Public pages** call Postgres functions through PostgREST with a ~60-line `fetch`
  wrapper (`src/lib/rest.ts`). The Supabase SDK is *not* in the public bundle.
- **Admin** uses `@supabase/supabase-js` (lazy-loaded) for Auth, Storage uploads and
  RPC calls carrying the user's JWT.
- All reads and writes go through SQL functions (`api_*`, `admin_*`, `submit_tool`,
  `newsletter_*`, `track_*`). There is no direct table access from the client.

```
Browser ──fetch──▶ /rest/v1/rpc/api_*        (SECURITY INVOKER, RLS applies)
Browser ──fetch──▶ /rest/v1/rpc/submit_tool  (SECURITY DEFINER, validated, rate-limited)
Admin   ──sdk────▶ /rest/v1/rpc/admin_*      (SECURITY INVOKER + explicit role check + RLS)
```

## Source layout

```
src/
  main.tsx, entry-server.tsx, routes.tsx    bootstrapping, route table
  lib/        api, rest, seo, markdown (safe renderer), recommend (wizard rules),
              directory (URL state), format, labels, consent, favorites, analytics
  components/ brand, layout, ui, catalog, editorial, forms
  pages/      public routes (each exports loader, handle.meta, Component)
  admin/      lazy-loaded CMS (auth, layout, editors, moderation, analytics)
  styles/     design tokens (Tailwind @theme) and editorial utilities
supabase/
  migrations/ schema, RLS, public API, engagement, admin API, storage
  seed.sql    categories, use cases, starter content held for review
  tests/      Supabase shim for plain Postgres + security tests
scripts/      prerender, local API emulator, local DB, DB test runner
```

## Database schema

Migrations live in `supabase/migrations` and are applied in filename order.

| Table | Purpose | Public read |
| --- | --- | --- |
| `categories` | 11 database-driven categories (name, slug, intro, icon, accent, SEO) | published |
| `use_cases` | Tasks for filters and the wizard (`task_label`) | published |
| `tools` | Tool profile, pricing, platforms, capabilities, Macedonian support, editorial assessment, verification fields, sponsorship, SEO, full-text `search_vector` | published |
| `tool_categories`, `tool_use_cases` | Many-to-many relations | if tool published |
| `tool_features` | Features with per-feature verification date | if tool published |
| `tool_updates` | Automatic change log (pricing, platforms, status…) + verification notes, reviewer | staff only |
| `articles`, `article_tools` | Guides in Markdown, related tools | published |
| `comparisons`, `comparison_tools` | Structured comparisons; criteria in JSONB; per-tool strengths/limitations | published, ≥2 published tools |
| `collections`, `collection_tools` | Editorial lists with methodology and per-entry reason, sponsorship flag | published, ≥1 tool |
| `tool_videos` | Hand-picked YouTube tutorials per tool (id, title, channel, language, note, order, visibility, refresh date) | visible + tool published |
| `site_settings` | Publisher/contact details supplied by the owner | all |
| `user_roles` | `admin` / `editor` (no browser write access) | own row |
| `submissions` | Tool suggestions (moderation queue) | staff |
| `contact_messages` | Contact form | staff |
| `newsletter_subscribers` | E-mail, consent time/version, status, unsubscribe token **hash** | admin |
| `outbound_clicks` | Daily click totals per tool and context | staff |
| `analytics_daily` | Daily event counters (event + slug dimension) | staff |
| `private.rate_limits`, `private.app_secrets` | Rate limiting with salted, daily-rotating client hashes | none |

Controlled vocabularies are Postgres enums (`content_status`, `pricing_type`,
`verification_status`, `skill_level`, `language_support`, `staff_role`) and CHECK
constraints (platforms, capabilities, slugs, `https://` URLs, length limits).
Publishing rules are enforced in the database, e.g. a published tool must have an
official URL, a short description and a primary category; a verified tool must have a
verification date; a published collection needs a methodology.

Indexes cover slugs (unique), `(status, published_at)`, featured flags, category and
use-case relations, pricing, verification due dates, a GIN index on `search_vector`
and a trigram index on tool names.

### Search

`api_search_tools` combines prefix full-text matching (`'simple'` configuration,
weighted name/keywords > descriptions), trigram-indexed name matching, and
category/use-case name matching, with filters for category, use case, pricing,
free plan and platform, sorting (editorial, newest, A–Ш, relevance) and pagination.
Editors add Cyrillic and Latin spellings as keywords (e.g. „чатгпт“).

## Security model

- **RLS everywhere.** Every table has RLS enabled; default Supabase grants are revoked
  and re-granted per table. Anonymous users can only `SELECT` published content.
- **Roles.** `is_staff()` / `is_admin()` are `SECURITY DEFINER` helpers reading
  `user_roles`. No grant allows `authenticated` to write `user_roles`, so roles can only
  be assigned with the service role or the SQL editor — a user cannot self-assign.
- **Admin functions** are `SECURITY INVOKER`, start with `assert_staff()` /
  `assert_admin()`, and are additionally constrained by RLS. Deleting, newsletter data
  and site settings require `admin`.
- **Visitor writes** go through `SECURITY DEFINER` functions with validation,
  honeypot, minimum fill time, duplicate detection and per-client + global rate limits.
- **Privacy.** No IP addresses are stored; rate limiting uses a salted SHA-256 hash
  that rotates daily and is purged after ~2 days. Analytics are daily counters only;
  search text is never sent. Unsubscribe tokens are stored as hashes.
- **Content rendering.** Markdown is parsed into React elements — raw HTML is never
  rendered, links are restricted to internal paths, `https:`, `http:` and `mailto:`,
  images to `https:`.
- **Keys.** Only the publishable/anon key is used in the browser. `vite.config.ts`
  refuses to build if `VITE_SUPABASE_ANON_KEY` is a service-role or secret key.

The security tests in `supabase/tests/security_test.sql` (95 assertions) cover
anonymous reads, unauthorized writes, role escalation, editor vs admin rights,
publishing constraints, preview access, rate limits, newsletter consent and analytics
whitelisting.

## Design system

Tokens are defined once in `src/styles/index.css` (`@theme`): the ink/paper palette,
four restrained accents plus two darker accent tones for small text (WCAG AA), Rubik
(display/body), Playfair Display (editorial standfirsts), IBM Plex Mono (metadata) and
Caveat (rare margin notes), small radii and the signature offset shadow. Fonts are
self-hosted (no third-party requests). Editorial textures — halftone, ruled index
cards, torn edges, registration marks, the stamp — are CSS/SVG and respect
`prefers-reduced-motion`.
