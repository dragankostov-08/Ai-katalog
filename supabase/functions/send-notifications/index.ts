// Supabase Edge Function (Deno): sends queued e-mails (alert confirmations and
// verified price-change alerts) through Resend.
//
// Secrets (supabase secrets set …):
//   RESEND_API_KEY  — API key of the e-mail provider
//   EMAIL_FROM      — verified sender, e.g. "AI KATALOG <izvestuvanja@primer.mk>"
//   SITE_URL        — public site URL, e.g. https://www.primer.mk
//   CRON_SECRET     — long random string; the scheduler sends it in x-cron-secret
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
// Deploy without JWT verification (it is called by the scheduler, not a user):
//   supabase functions deploy send-notifications --no-verify-jwt
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Job {
  id: string
  kind: 'watch_confirm' | 'price_change'
  email: string
  payload: {
    watcher_id: string
    tool_name: string
    tool_slug: string
    confirm_token?: string
    unsubscribe_token?: string
    changes?: { field: string; old: string | null; new: string | null }[]
  }
}

const FIELDS: Record<string, string> = {
  pricing_type: 'Модел на плаќање',
  starting_price: 'Почетна цена',
  currency: 'Валута',
  price_period: 'Период на плаќање',
  has_free_plan: 'Бесплатен план',
  free_plan_limits: 'Ограничувања на бесплатниот план',
}
const VALUES: Record<string, string> = {
  free: 'Бесплатна', freemium: 'Фримиум', paid: 'Платена', free_trial: 'Пробен период', open_source: 'Отворен код', unknown: 'Непознато',
  month: 'месечно', year: 'годишно', one_time: 'еднократно', usage: 'според потрошувачка', true: 'да', false: 'не',
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const show = (value: string | null) => {
  if (value === null || value === '' || value === 'null') return '—'
  const clean = value.replace(/^"|"$/g, '')
  return VALUES[clean] ?? clean
}

function compose(job: Job, site: string) {
  const p = job.payload
  const unsubscribe = `${site}/sledi/odjava?id=${p.watcher_id}&token=${p.unsubscribe_token ?? ''}`
  const profile = `${site}/alatka/${p.tool_slug}`
  if (job.kind === 'watch_confirm') {
    const confirm = `${site}/sledi/potvrdi?id=${p.watcher_id}&token=${p.confirm_token ?? ''}`
    const text = `Здраво,\n\nпобаравте известување кога ќе се смени цената или планот на ${p.tool_name} на AI KATALOG.\n\nПотврдете тука: ${confirm}\n\nАко не го побаравте ова, игнорирајте ја пораката — нема да добивате ништо.\n\nAI KATALOG`
    const html = `<p>Здраво,</p><p>побаравте известување кога ќе се смени цената или планот на <strong>${escapeHtml(p.tool_name)}</strong> на AI KATALOG.</p><p><a href="${escapeHtml(confirm)}">Потврди го следењето</a></p><p style="color:#555">Ако не го побаравте ова, игнорирајте ја пораката — нема да добивате ништо.</p>`
    return { subject: `Потврди го следењето на ${p.tool_name}`, text, html, unsubscribe }
  }
  const lines = (p.changes ?? []).map((c) => `${FIELDS[c.field] ?? c.field}: ${show(c.old)} → ${show(c.new)}`)
  const text = `Уредништвото на AI KATALOG потврди промена кај ${p.tool_name}:\n\n${lines.map((l) => `• ${l}`).join('\n')}\n\nПрофил: ${profile}\n\nОдјава од известувањата: ${unsubscribe}`
  const html = `<p>Уредништвото на AI KATALOG потврди промена кај <strong>${escapeHtml(p.tool_name)}</strong>:</p><ul>${lines
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join('')}</ul><p><a href="${escapeHtml(profile)}">Отвори го профилот</a></p><p style="color:#555;font-size:12px"><a href="${escapeHtml(unsubscribe)}">Одјави се од известувањата за ${escapeHtml(p.tool_name)}</a></p>`
  return { subject: `${p.tool_name}: променета цена или план`, text, html, unsubscribe }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('forbidden', { status: 403 })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  const site = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '')
  if (!apiKey || !from || !site) return new Response('not configured', { status: 503 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data, error } = await supabase.rpc('claim_notifications', { p_limit: 25 })
  if (error) return new Response(`claim failed: ${error.message}`, { status: 500 })

  let sent = 0
  for (const job of (data ?? []) as Job[]) {
    const mail = compose(job, site)
    let ok = false
    let message: string | null = null
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [job.email],
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          headers: { 'List-Unsubscribe': `<${mail.unsubscribe}>` },
        }),
      })
      ok = response.ok
      if (!ok) message = `Resend ${response.status}: ${(await response.text()).slice(0, 300)}`
    } catch (caught) {
      message = String(caught)
    }
    await supabase.rpc('complete_notification', { p_id: job.id, p_ok: ok, p_error: message })
    if (ok) sent++
  }
  return new Response(JSON.stringify({ claimed: (data ?? []).length, sent }), { headers: { 'Content-Type': 'application/json' } })
})
