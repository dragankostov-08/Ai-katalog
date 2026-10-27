# Implementation status

## Phase 1 — MVP (implemented)

| Area | Status |
| --- | --- |
| Home `/` | Editorial hero with working search, real catalogue counts, category index, featured and recently added tools, lists, guides, comparisons, wizard call-to-action, newsletter. Sections with no published content are hidden. |
| Directory `/alatki` | Database search (prefix full-text + trigram + category/use-case names), category, use case, pricing, free plan and platform filters, 4 sort orders, pagination, shareable URLs, active filter chips, mobile filter dialog, skeletons, empty and error states. |
| Categories `/kategorii`, `/kategorii/:slug` | Database-driven, unique SEO metadata, related guides/comparisons; empty categories are labelled „Во подготовка“, not linked, `noindex` and excluded from the sitemap. |
| Tool profiles `/alatka/:slug` | Dossier layout: identity, official link (tracked in aggregate), pricing with explicit verification status, features, capabilities, platforms, Macedonian support, pros/cons and verdict marked as editorial opinion, verification date, related tools/guides/comparisons/lists, price-change notice, correction link. Only meaningful fields are shown. |
| Comparisons `/sporedbi/:slug` | Structured table built from verified tool data + editorial criteria + per-tool strengths/limitations; „Нема проверен податок“ where unverified; stacked layout on mobile. |
| Guides `/vodici/:slug` | Safe Markdown (headings, lists, tables, images with captions, code, callouts), table of contents, reading time, author, published/updated dates, related tools and guides, Article + Breadcrumb JSON-LD. |
| Lists `/najdobri/:slug` | Methodology box, numbered entries with editorial reasons, sponsored labelling. |
| Wizard `/pronajdi` | 5 questions, transparent rules, reasons and cautions per result, unknown data never scores, sponsorship ignored, shareable URL, no AI API. |
| Static pages | `/za-nas`, `/metodologija`, `/kontakt` (form), `/privatnost`, `/uslovi`, `/kolacinja`, `/oglasuvanje`, `/affiliate-izjava`; publisher/contact details come from admin settings and are never invented. |
| Global | 404 page, error boundaries, loading states, accessible dialogs, skip link, focus styles, keyboard support, reduced motion, consent banner. |
| Admin `/admin` | Supabase Auth, role-gated (admin/editor); dashboard; CRUD for tools, categories, use cases, guides, comparisons, lists; features editor; Markdown preview; image upload to Storage; status workflow (draft / needs review / published / archived); staff preview of drafts; verification queue with notes, history and next-review dates; submissions moderation; contact messages; aggregate analytics; newsletter (admin only); site settings (admin only). |
| SEO | Pre-rendered HTML for every public page, unique titles/descriptions, canonical URLs, Open Graph image, sitemap.xml, robots.txt, `noindex` for filtered/empty/preview/utility pages, breadcrumbs, structured data only where supported by content. |
| Advertising | Reusable `AdSlot` placements (home, directory, tool, guide, comparison); nothing renders until an approved account is configured and the visitor consents; `ads.txt` generated. |

## Phase 2 (implemented foundations)

- Local favorites without registration (`/omileni`).
- Newsletter with explicit consent, validation, duplicate prevention, hashed unsubscribe tokens and a one-click unsubscribe page. **No e-mail sending is implemented**: connect a provider (e.g. via a Supabase Edge Function) before sending, and include the unsubscribe link.
- Visitor tool suggestions with validation, honeypot, timing check, duplicate detection and rate limits; moderation queue.
- Verification workflow: status, last verified date, reviewer, change log, next review date, overdue queue.
- Consent-gated aggregate analytics for search, category/tool/comparison/guide/list views, recommendation selections, wizard completions and newsletter signups; outbound clicks counted as anonymous daily totals.

## Deferred (Phase 2–3)

| Item | Notes |
| --- | --- |
| E-mail delivery (newsletter, submission replies) | Needs a provider and a server-side function holding its API key. |
| Optional user accounts, synced favorites, profiles, personalization | Schema intentionally not created yet (incremental migrations). Favorites table design is in the brief. |
| Pricing/feature history pages | `tool_updates` already records dated changes; a public „историја на цени“ view is not built. |
| Community reviews/reports | Not built by design until moderation and abuse policies exist. |
| Partner/sponsored listing workflow (contracts, billing) | Only the labelling flag exists. |
| AI-powered discovery | Not built; the rule-based wizard is the baseline. |
| Certified CMP for EEA ad traffic | Required by Google before serving ads to EEA/UK/CH visitors. |
| Automatic retention clean-up for messages/suggestions | Currently manual (admin delete). |

## Launch checklist (owner actions)

- [ ] Create the Supabase project, apply migrations, create the first admin (docs/SETUP.md).
- [ ] Enter real publisher and contact details in **Поставки**.
- [ ] Have the privacy policy, terms and cookie texts reviewed by a legal adviser.
- [ ] Verify and publish starter tools one by one (prices are intentionally empty).
- [ ] Review and publish the starter guides, comparison and lists.
- [ ] Set `VITE_SITE_URL` to the production domain and deploy (docs/DEPLOYMENT.md).
- [ ] Configure a deploy hook so publishing triggers a rebuild.
- [ ] Submit the sitemap to search engines.
- [ ] Only after AdSense approval: configure ad variables and a CMP.

Nothing in this repository has been deployed to a hosting provider or connected to a
real Supabase project yet; those steps require the owner's accounts and credentials.
