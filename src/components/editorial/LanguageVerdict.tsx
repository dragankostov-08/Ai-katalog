import { verdictLabels } from '../../lib/labels'
import type { LanguageVerdict } from '../../lib/types'

const styles: Record<LanguageVerdict, string> = {
  excellent: 'bg-teal text-white',
  good: 'bg-mustard text-ink',
  mixed: 'border border-ink/40 bg-white text-ink',
  poor: 'bg-graphite text-paper',
}

const marks: Record<LanguageVerdict, string> = { excellent: '●●●●', good: '●●●○', mixed: '●●○○', poor: '●○○○' }

export function LanguageVerdictBadge({ verdict }: { verdict: LanguageVerdict }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-xs px-2 py-0.5 font-mono text-[0.6875rem] tracking-wide uppercase ${styles[verdict]}`}>
      <span aria-hidden className="tracking-[-0.1em]">
        {marks[verdict]}
      </span>
      {verdictLabels[verdict]}
    </span>
  )
}
