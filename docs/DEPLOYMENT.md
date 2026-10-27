# Deployment

The build output (`dist/`) is static: pre-rendered HTML for every published page plus
the client bundle. Any static host with rewrite support works.

## Vercel (recommended)

1. Import the repository. Framework preset: *Other* (settings come from `vercel.json`).
2. Add the environment variables from `docs/SETUP.md` to Production (and Preview,
   pointing at a staging Supabase project if you have one).
3. Deploy. `vercel.json` provides:
   - `cleanUrls` so `/alatka/chatgpt.html` is served at `/alatka/chatgpt`;
   - SPA fallback rewrites for `/admin` and for content published after the last build;
   - Vercel's 404 handling uses the pre-rendered `404.html` for unknown URLs;
   - security headers (HSTS, nosniff, frame denial, referrer policy) and immutable
     caching for hashed assets; `X-Robots-Tag: noindex` for `/admin`.

The build fails if Supabase is configured but a page cannot be pre-rendered, so a
broken deploy never replaces a working one. Set `PRERENDER_ALLOW_ERRORS=1` only to
deliberately ship with client-side rendering for the failing pages.

## Netlify

Build command `npm run build`, publish directory `dist`. `public/_redirects` contains
the same fallback rules. Add the security headers in the Netlify UI or a `_headers` file.

## Rebuild when content is published

Pre-rendered HTML (what search engines see) updates on each build. Visitors always get
fresh data on navigation, but to refresh the static HTML and sitemap:

1. Vercel → Project → Settings → Git → **Deploy Hooks** → create a hook.
2. Supabase → Database → **Webhooks** → on `INSERT`/`UPDATE` of `tools`, `articles`,
   `comparisons`, `collections`, `categories` → HTTP POST to the deploy hook URL.
   The hook URL stays on the server side (Supabase), never in the browser.

For large catalogues, debounce rebuilds (e.g. a scheduled hook every 30 minutes).

## Domain and SEO

- Set `VITE_SITE_URL` to the final canonical domain before the first production build
  (canonical links, Open Graph and `sitemap.xml` use it).
- Submit `https://<domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- `robots.txt` disallows `/admin`, `/omileni` and `/newsletter/`.
- No ranking outcome is promised: quality and freshness of the content decide.

## Advertising (after approval only)

1. Apply for AdSense with the live site. Approval is not guaranteed.
2. After approval set `VITE_ADSENSE_CLIENT=ca-pub-…` and the slot IDs
   (`VITE_AD_SLOT_HOME`, `_DIRECTORY`, `_TOOL`, `_ARTICLE`, `_COMPARISON`) and rebuild.
   The build then writes `ads.txt`.
3. Ads load only after a visitor accepts *Рекламирање* in the consent dialog. For
   visitors from the EEA/UK/Switzerland Google requires a certified consent management
   platform (CMP); integrate one before serving ads to that traffic.
4. Without configuration the ad slots render nothing (a dashed outline appears only in
   development). Measure revenue in the AdSense dashboard.

## Post-deploy verification

- Open `/`, `/alatki`, a tool page and `/admin` on the production domain.
- View source of a tool page: content, `<title>` and canonical must be in the HTML.
- Confirm `/sitemap.xml` and `/robots.txt` use the production domain.
- Search the built assets for secrets: `grep -r "service_role" dist/` must be empty.
