import { ArrowDown, ArrowUp, ExternalLink, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { formatShortDate } from '../../lib/format'
import { formatDuration, parseYouTubeId, videoLanguageLabels, youtubeWatchUrl, type VideoLanguage } from '../../lib/youtube'
import { adminApi, type AdminToolVideo, type YouTubeResult } from '../api'
import { controlClass, ErrorBox, move, Panel, useAsync, useToast } from './ui'

const LANGUAGES = Object.keys(videoLanguageLabels) as VideoLanguage[]

const SEARCH_PRESETS: { language: string; label: string; query: (name: string) => string }[] = [
  { language: 'mk', label: 'Македонски', query: (name) => `${name} туторијал` },
  { language: 'regional', label: 'Регионални', query: (name) => `${name} tutorijal` },
  { language: 'en', label: 'Англиски', query: (name) => `${name} tutorial for beginners` },
]

function LanguageSelect({ value, onChange, label }: { value: VideoLanguage; onChange: (value: VideoLanguage) => void; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as VideoLanguage)} className={`${controlClass} w-auto`}>
      {LANGUAGES.map((language) => (
        <option key={language} value={language}>
          {videoLanguageLabels[language]}
        </option>
      ))}
    </select>
  )
}

function VideoRow({
  video,
  index,
  count,
  onChange,
  onMove,
  onDelete,
}: {
  video: AdminToolVideo
  index: number
  count: number
  onChange: (patch: Partial<AdminToolVideo>) => void
  onMove: (delta: number) => void
  onDelete: () => void
}) {
  const [note, setNote] = useState(video.note ?? '')
  return (
    <li className={`border p-3 ${video.is_visible ? 'border-ink/25 bg-white' : 'border-dashed border-ink/30 bg-paper opacity-80'}`}>
      <div className="flex items-start gap-2">
        <span className="font-mono text-xs text-graphite">{index + 1}.</span>
        <div className="min-w-0 flex-1">
          <a href={youtubeWatchUrl(video.youtube_id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
            {video.title} <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
          <p className="font-mono text-xs text-graphite">
            {[video.channel_title, formatDuration(video.duration_seconds), video.source === 'youtube_search' ? 'од пребарување' : 'рачно додадено']
              .filter(Boolean)
              .join(' · ')}
            {video.metadata_refreshed_at ? ` · проверено ${formatShortDate(video.metadata_refreshed_at)}` : ''}
          </p>
        </div>
        <button type="button" aria-label="Нагоре" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 disabled:opacity-30">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Надолу" disabled={index === count - 1} onClick={() => onMove(1)} className="p-1 disabled:opacity-30">
          <ArrowDown className="h-4 w-4" />
        </button>
        <button type="button" aria-label={`Отстрани: ${video.title}`} onClick={onDelete} className="p-1 text-tomato-ink">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <LanguageSelect label="Јазик на видеото" value={video.language} onChange={(language) => onChange({ language })} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={video.is_visible} onChange={(e) => onChange({ is_visible: e.target.checked })} className="h-4 w-4 accent-ink" />
          Видливо на сајтот
        </label>
        <input
          aria-label="Јавна белешка"
          placeholder="Јавна белешка, на пр. „Добро за почетници“"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (video.note ?? '') && onChange({ note })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
          className={`${controlClass} min-w-48 flex-1`}
        />
      </div>
    </li>
  )
}

/** Attach YouTube tutorials to a tool: by link, or by picking from search results. */
export function ToolVideosPanel({ toolId, toolName }: { toolId: string; toolName: string }) {
  const toast = useToast()
  const videos = useAsync(() => adminApi.toolVideos(toolId), [toolId])
  const [link, setLink] = useState('')
  const [manual, setManual] = useState<{ youtube_id: string; title: string; channel_title: string; language: VideoLanguage } | null>(null)
  const [query, setQuery] = useState(SEARCH_PRESETS[0].query(toolName))
  const [language, setLanguage] = useState('mk')
  const [results, setResults] = useState<YouTubeResult[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const list = videos.data ?? []
  const attached = new Set(list.map((video) => video.youtube_id))

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label)
    try {
      await action()
    } catch (error) {
      toast('error', (error as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const save = (payload: Record<string, unknown>) =>
    run('save', async () => {
      await adminApi.saveToolVideo({ tool_id: toolId, ...payload })
      videos.reload()
    })

  // This panel sits inside the tool editor form, so it must never submit it.
  const onEnter = (action: () => void) => (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      action()
    }
  }

  async function onAddLink() {
    const id = parseYouTubeId(link)
    if (!id) {
      toast('error', 'Ова не е валиден YouTube линк.')
      return
    }
    if (attached.has(id)) {
      toast('error', 'Ова видео веќе е додадено.')
      return
    }
    await run('link', async () => {
      try {
        const { items } = await adminApi.youtubeLookup([id])
        const video = items[0]
        if (!video) throw new Error('Видеото не е достапно (избришано, приватно или не постои).')
        if (!video.embeddable) toast('error', 'Авторот не дозволува вградување — на сајтот ќе се прикаже само линк кон YouTube.')
        await adminApi.saveToolVideo({ tool_id: toolId, ...video, source: 'manual', metadata_refreshed_at: new Date().toISOString() })
        setLink('')
        videos.reload()
        toast('success', `Додадено: ${video.title}`)
      } catch (error) {
        // Without the YouTube function the editor fills in the details by hand.
        if ((error as Error).message.includes('YouTube')) {
          setManual({ youtube_id: id, title: '', channel_title: '', language: 'en' })
        } else {
          throw error
        }
      }
    })
  }

  function addManual() {
    if (!manual) return
    if (!manual.title.trim()) {
      toast('error', 'Внеси наслов на видеото.')
      return
    }
    save({ ...manual, source: 'manual' })
    setManual(null)
    setLink('')
  }

  async function onSearch() {
    await run('search', async () => {
      const { items } = await adminApi.youtubeSearch(query, language)
      setResults(items)
    })
  }

  async function reorder(index: number, delta: number) {
    const next = move(list, index, delta)
    await run('reorder', async () => {
      await adminApi.reorderToolVideos(toolId, next.map((video) => video.id))
      videos.reload()
    })
  }

  async function refresh() {
    await run('refresh', async () => {
      const { items, missing } = await adminApi.youtubeLookup(list.map((video) => video.youtube_id))
      const result = await adminApi.refreshToolVideos(toolId, items, missing)
      videos.reload()
      toast('success', `Освежени: ${result.updated}. Скриени како недостапни: ${result.hidden}.`)
    })
  }

  return (
    <Panel
      title="Видео туторијали"
      actions={
        list.length ? (
          <button type="button" onClick={refresh} disabled={!!busy} className="inline-flex items-center gap-1 text-xs underline disabled:opacity-50">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Провери достапност
          </button>
        ) : null
      }
    >
      <p className="mb-4 text-xs text-graphite">
        Ништо не се додава автоматски. Пред да додадеш видео, изгледај го: дали е точно, ажурно и корисно. Предност дај им на видеата на македонски.
      </p>

      {videos.error ? <ErrorBox message={videos.error} onRetry={videos.reload} /> : null}
      {list.length ? (
        <ol className="mb-5 space-y-2">
          {list.map((video, index) => (
            <VideoRow
              key={video.id}
              video={video}
              index={index}
              count={list.length}
              onChange={(patch) => save({ ...video, ...patch })}
              onMove={(delta) => reorder(index, delta)}
              onDelete={() =>
                window.confirm(`Да се отстрани „${video.title}“?`) &&
                run('delete', async () => {
                  await adminApi.deleteToolVideo(video.id)
                  videos.reload()
                })
              }
            />
          ))}
        </ol>
      ) : videos.loading ? null : (
        <p className="mb-5 text-sm text-graphite">Сè уште нема видеа.</p>
      )}

      <div className="flex gap-2">
        <label htmlFor="video-link" className="sr-only">
          YouTube линк
        </label>
        <input
          id="video-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={onEnter(onAddLink)}
          placeholder="Залепи YouTube линк…"
          className={controlClass}
        />
        <Button variant="secondary" disabled={!link.trim() || !!busy} onClick={onAddLink}>
          <Plus className="h-4 w-4" aria-hidden /> {busy === 'link' ? 'Се додава…' : 'Додај линк'}
        </Button>
      </div>

      {manual ? (
        <div className="mt-3 space-y-2 border border-mustard bg-cream/40 p-3">
          <p className="text-xs">YouTube функцијата не е достапна — внеси ги податоците рачно (видео: {manual.youtube_id}).</p>
          <input aria-label="Наслов" placeholder="Наслов на видеото" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} onKeyDown={onEnter(addManual)} className={controlClass} />
          <input aria-label="Канал" placeholder="Канал (автор)" value={manual.channel_title} onChange={(e) => setManual({ ...manual, channel_title: e.target.value })} onKeyDown={onEnter(addManual)} className={controlClass} />
          <div className="flex flex-wrap gap-2">
            <LanguageSelect label="Јазик" value={manual.language} onChange={(value) => setManual({ ...manual, language: value })} />
            <Button size="sm" onClick={addManual}>
              Додај видео
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setManual(null)}>
              Откажи
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-ink/15 pt-4">
        <p className="mb-2 text-sm font-medium">Пребарај на YouTube</p>
        <div className="mb-2 flex flex-wrap gap-1">
          {SEARCH_PRESETS.map((preset) => (
            <button
              key={preset.language}
              type="button"
              onClick={() => {
                setLanguage(preset.language)
                setQuery(preset.query(toolName))
              }}
              className={`px-2.5 py-1 text-xs ${language === preset.language ? 'bg-ink text-paper' : 'border border-ink/30'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor="video-search" className="sr-only">
            Барање
          </label>
          <input id="video-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onEnter(onSearch)} className={controlClass} />
          <Button disabled={!!busy} onClick={onSearch}>
            <Search className="h-4 w-4" aria-hidden /> {busy === 'search' ? 'Се бара…' : 'Барај'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-graphite">Секое пребарување троши дел од дневната квота на YouTube API (околу 100 пребарувања дневно).</p>
      </div>

      {results ? (
        results.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {results.map((result) => (
              <li key={result.youtube_id} className="flex gap-3 border border-ink/20 bg-white p-2">
                {result.thumbnail_url ? <img src={result.thumbnail_url} alt="" className="h-16 w-28 shrink-0 object-cover" loading="lazy" /> : null}
                <div className="min-w-0 flex-1">
                  <a href={youtubeWatchUrl(result.youtube_id)} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-medium hover:underline">
                    {result.title}
                  </a>
                  <p className="font-mono text-[0.6875rem] text-graphite">
                    {[result.channel_title, formatDuration(result.duration_seconds), formatShortDate(result.video_published_at)].filter(Boolean).join(' · ')}
                  </p>
                  {attached.has(result.youtube_id) ? (
                    <span className="mt-1 inline-block text-xs text-teal-ink">✓ Додадено</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() =>
                        save({
                          ...result,
                          language: result.language === 'other' ? (language === 'mk' || language === 'regional' || language === 'en' ? language : 'other') : result.language,
                          source: 'youtube_search',
                          metadata_refreshed_at: new Date().toISOString(),
                        })
                      }
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" aria-hidden /> Додај кон {toolName}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-graphite">Нема резултати.</p>
        )
      ) : null}
    </Panel>
  )
}
