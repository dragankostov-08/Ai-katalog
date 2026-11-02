import { Check, Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'

/** Splits a prompt into text and [placeholders] so the placeholders stand out. */
function highlight(text: string): ReactNode[] {
  return text.split(/(\[[^\]\n]{1,80}\])/g).map((part, index) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <mark key={index} className="rounded-xs bg-brand-line px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers without the async clipboard API.
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

export function CopyButton({ text, label = 'Копирај промпт', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-sm bg-tomato px-3 py-1.5 text-sm font-semibold text-white hover:bg-tomato-ink ${className}`}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{copied ? 'Копирано' : label}</span>
    </button>
  )
}

export function PromptText({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-light bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-light px-4 py-2">
        <span className="label-mono text-graphite">Промпт</span>
        <CopyButton text={text} />
      </div>
      <pre
        tabIndex={0}
        className={`overflow-x-auto px-4 py-4 font-code text-[0.875rem] leading-relaxed whitespace-pre-wrap text-ink ${compact ? 'max-h-64' : ''}`}
      >
        {highlight(text)}
      </pre>
      <p className="border-t border-light px-4 py-2 text-xs text-graphite">Деловите во [загради] замени ги со твои податоци.</p>
    </div>
  )
}
