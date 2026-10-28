import { ArrowUpRight, Play } from 'lucide-react'
import { useState } from 'react'
import { formatDuration, videoLanguageLabels, youtubeEmbedUrl, youtubeWatchUrl } from '../../lib/youtube'
import type { ToolVideo } from '../../lib/types'

/**
 * Privacy-friendly YouTube embed: nothing is loaded from YouTube until the
 * visitor presses play, and then only from youtube-nocookie.com.
 */
function VideoCard({ video, index }: { video: ToolVideo; index: number }) {
  const [playing, setPlaying] = useState(false)
  const duration = formatDuration(video.duration_seconds)

  return (
    <li className="flex flex-col">
      <div className="relative aspect-video overflow-hidden border border-ink bg-ink">
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(video.youtube_id)}
            title={video.title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex h-full w-full flex-col justify-between p-4 text-left text-paper"
            aria-label={`Пушти го видеото: ${video.title}`}
          >
            <span aria-hidden className="absolute -right-8 -bottom-10 h-48 w-48 rounded-full opacity-30 halftone-coarse invert" />
            <span className="relative flex items-center justify-between gap-2 font-mono text-[0.6875rem] tracking-wide uppercase">
              <span>№ {String(index + 1).padStart(2, '0')}</span>
              {duration ? <span className="bg-paper px-1.5 py-0.5 text-ink">{duration}</span> : null}
            </span>
            <span className="relative flex items-end justify-between gap-4">
              <span className="line-clamp-3 font-display text-lg leading-tight font-bold">{video.title}</span>
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tomato text-white transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-graphite">
        <span className={`rounded-xs px-1.5 py-0.5 ${video.language === 'mk' ? 'bg-mustard text-ink' : 'border border-ink/30'}`}>
          {videoLanguageLabels[video.language]}
        </span>
        {video.channel_title ? <span>{video.channel_title}</span> : null}
        <a href={youtubeWatchUrl(video.youtube_id)} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-0.5 underline hover:text-ink">
          YouTube <ArrowUpRight className="h-3 w-3" aria-hidden />
          <span className="sr-only">(се отвора во нов прозорец)</span>
        </a>
      </div>
      {video.note ? <p className="mt-1.5 text-sm text-charcoal">{video.note}</p> : null}
    </li>
  )
}

export function VideoTutorials({ videos, toolName }: { videos: ToolVideo[]; toolName: string }) {
  if (!videos.length) return null
  return (
    <section aria-labelledby="tool-videos">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-3">
        <h2 id="tool-videos" className="font-display text-2xl font-extrabold md:text-3xl">
          Видео туторијали за {toolName}
        </h2>
        <p className="label-mono text-graphite">Рачно одбрани од уредништвото</p>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2">
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} index={index} />
        ))}
      </ul>
      <p className="mt-4 text-xs text-graphite">
        Видеата се од YouTube и ги објавиле нивните автори. Ништо не се вчитува од YouTube додека не кликнеш „пушти“.
      </p>
    </section>
  )
}
