import { Send } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '../../components/editorial/PromptText'
import { Button } from '../../components/ui/Button'
import { digestHtml, digestText, isEmptyDigest } from '../../lib/digest'
import { env } from '../../lib/env'
import { formatShortDate } from '../../lib/format'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, useAsync, useToast } from '../components/ui'

export function DigestPage() {
  const toast = useToast()
  const [days, setDays] = useState(7)
  const [posting, setPosting] = useState(false)
  const { data, error, loading, reload } = useAsync(() => adminApi.weeklyDigest(days), [days])
  const period = data ? `${formatShortDate(data.since)} – ${formatShortDate(new Date())}` : ''
  const text = data ? digestText(data, env.siteUrl, period) : ''
  const html = data ? digestHtml(data, env.siteUrl, period) : ''

  async function postToTelegram() {
    if (!window.confirm('Да се објави прегледот на Telegram каналот?')) return
    setPosting(true)
    try {
      await adminApi.postTelegram(text)
      toast('success', 'Објавено на Telegram.')
    } catch (caught) {
      toast('error', (caught as Error).message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Неделен преглед"
        description="Автоматски состав на новото во каталогот, подготвен за Viber, Telegram и билтенот. Прочитај го пред објавување."
        actions={
          <select aria-label="Период" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-10 border border-ink/40 bg-white px-2 text-sm">
            <option value={7}>Последни 7 дена</option>
            <option value={14}>Последни 14 дена</option>
            <option value={30}>Последни 30 дена</option>
          </select>
        }
      />
      {loading && !data ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        isEmptyDigest(data) ? (
          <p className="border border-dashed border-ink/30 bg-white p-6 text-center text-sm text-graphite">Нема ново објавена содржина во избраниот период.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Viber / Telegram (обичен текст)" actions={<CopyButton text={text} label="Копирај" />}>
              <pre className="max-h-[32rem] overflow-y-auto font-mono text-xs whitespace-pre-wrap">{text}</pre>
              <div className="mt-4 border-t border-ink/15 pt-3">
                <Button size="sm" variant="secondary" onClick={postToTelegram} disabled={posting}>
                  <Send className="h-4 w-4" aria-hidden /> {posting ? 'Се објавува…' : 'Објави на Telegram'}
                </Button>
                <p className="mt-2 text-xs text-graphite">
                  Бара Edge Function „telegram-post“ со TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID (docs/CHANNELS.md). За Viber канал: копирај и залепи.
                </p>
              </div>
            </Panel>
            <Panel title="Билтен (HTML)" actions={<CopyButton text={html} label="Копирај HTML" />}>
              <div className="max-h-[32rem] overflow-y-auto border border-ink/15 bg-white p-4 text-sm [&_a]:underline [&_h1]:mb-2 [&_h1]:font-bold [&_h2]:font-bold [&_ul]:list-disc">
                {/* Preview of trusted, locally escaped markup generated from our own data. */}
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </Panel>
          </div>
        )
      ) : null}
    </>
  )
}
