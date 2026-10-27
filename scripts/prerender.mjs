// Pre-renders every public, canonical page to static HTML after `vite build`,
// and writes sitemap.xml, robots.txt, 404.html and the SPA fallback shell.
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const dist = path.join(root, 'dist')
const serverEntry = path.join(root, 'dist-ssr', 'entry-server.js')
const allowErrors = process.env.PRERENDER_ALLOW_ERRORS === '1'
const CONCURRENCY = 6

const { render, listPaths, env, isBackendConfigured } = await import(pathToFileURL(serverEntry).href)
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const origin = env.siteUrl

const defaultHead = `<title>AI KATALOG — AI алатки на македонски</title>
    <meta name="description" content="Откриј, спореди и научи да користиш AI алатки за работа, учење и креативност.">`

function page(head, html) {
  return template.replace('<!--app-head-->', head).replace('<!--app-html-->', html)
}

function fileFor(urlPath) {
  if (urlPath === '/') return path.join(dist, 'index.html')
  return path.join(dist, `${urlPath.replace(/^\//, '')}.html`)
}

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

if (!isBackendConfigured) {
  console.warn('[prerender] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set: only static pages are pre-rendered.')
}

// SPA fallback for routes that are not pre-rendered (new content, admin).
await write(path.join(dist, '_spa.html'), page(defaultHead, ''))

const { indexable, extra } = await listPaths()
const targets = [...indexable.map((entry) => entry.path), ...extra]
const failures = []
const rendered = new Set()

async function renderOne(urlPath) {
  const result = await render(urlPath, origin)
  if (result.status === 200) {
    await write(fileFor(urlPath), page(result.head, result.html))
    rendered.add(urlPath)
  } else if (result.status === 404) {
    console.warn(`[prerender] 404 ${urlPath} (skipped)`)
  } else {
    failures.push(`${result.status} ${urlPath}${result.error ? `: ${result.error}` : ''}`)
  }
}

for (let i = 0; i < targets.length; i += CONCURRENCY) {
  await Promise.all(targets.slice(i, i + CONCURRENCY).map(renderOne))
}

const notFound = await render('/__ai-katalog-404__', origin)
await write(path.join(dist, '404.html'), page(notFound.head, notFound.html))

const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .filter((entry) => rendered.has(entry.path))
  .map(
    (entry) => `  <url><loc>${escapeXml(origin + (entry.path === '/' ? '/' : entry.path))}</loc><lastmod>${(entry.lastmod ?? today).slice(0, 10)}</lastmod></url>`,
  )
  .join('\n')}
</urlset>
`
await write(path.join(dist, 'sitemap.xml'), sitemap)

await write(
  path.join(dist, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /admin
Disallow: /omileni
Disallow: /newsletter/

Sitemap: ${origin}/sitemap.xml
`,
)

if (env.adsenseClient) {
  const publisher = env.adsenseClient.replace(/^ca-/, '')
  await write(path.join(dist, 'ads.txt'), `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`)
}

console.log(`[prerender] ${rendered.size} pages, sitemap with ${indexable.filter((e) => rendered.has(e.path)).length} URLs.`)

if (failures.length) {
  console.error(`[prerender] ${failures.length} page(s) failed:\n  ${failures.join('\n  ')}`)
  if (isBackendConfigured && !allowErrors) {
    console.error('[prerender] Failing the build. Set PRERENDER_ALLOW_ERRORS=1 to deploy with client-side rendering for these pages.')
    process.exit(1)
  }
}
