// Supabase Edge Function (Deno): posts the weekly digest to a Telegram channel.
//
// Secrets: TELEGRAM_BOT_TOKEN (from @BotFather) and TELEGRAM_CHAT_ID
// (e.g. @imenakanal; the bot must be an admin of the channel).
//   supabase functions deploy telegram-post
// Only signed-in staff may call it (checked with public.is_staff()).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Telegram messages are limited to 4096 characters: split on paragraph breaks. */
function chunks(text: string, size = 3800): string[] {
  const parts: string[] = []
  let current = ''
  for (const paragraph of text.split('\n\n')) {
    if ((current + '\n\n' + paragraph).length > size && current) {
      parts.push(current)
      current = paragraph
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph
    }
  }
  if (current) parts.push(current.slice(0, 4096))
  return parts
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chat = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!token || !chat) return json(503, { message: 'TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID не се поставени.' })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: isStaff } = await supabase.rpc('is_staff')
  if (isStaff !== true) return json(403, { message: 'Само за уредници.' })

  const { text } = (await req.json().catch(() => ({}))) as { text?: string }
  if (!text || text.length < 10 || text.length > 20000) return json(400, { message: 'Текстот е празен или предолг.' })

  for (const part of chunks(text)) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: part, disable_web_page_preview: true }),
    })
    if (!response.ok) return json(502, { message: `Telegram одговори со ${response.status}: ${(await response.text()).slice(0, 200)}` })
  }
  return json(200, { ok: true })
})
