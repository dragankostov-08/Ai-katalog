import { Link } from 'react-router'

/** Printer's registration mark. */
function RegistrationMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/** Rubber stamp with circular text. */
function Stamp({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <path id="stamp-circle" d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="var(--color-tomato)" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="var(--color-tomato)" strokeWidth="1.5" />
      <text fill="var(--color-tomato)" fontFamily="var(--font-mono)" fontSize="9.5" fontWeight="500" letterSpacing="1.5">
        <textPath href="#stamp-circle">РАЧНО УРЕДУВАНО · НА МАКЕДОНСКИ ·</textPath>
      </text>
      <text x="60" y="66" textAnchor="middle" fill="var(--color-tomato)" fontFamily="var(--font-display)" fontWeight="900" fontSize="17">
        AI·K
      </text>
    </svg>
  )
}

/**
 * Halftone line illustration of a vintage computer, drawn as a cut-out with a
 * cream border — the hero's central image. Pure SVG, no photography.
 */
function RetroComputer({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 250" className={className} role="img" aria-label="Илустрација: стар компјутер со текст „најди алатка“ на екранот">
      <defs>
        <pattern id="hc-dots" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.25" fill="var(--color-ink)" />
        </pattern>
        <pattern id="hc-dots-fine" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.75" fill="var(--color-paper)" opacity="0.55" />
        </pattern>
        <linearGradient id="hc-shade" x1="0" x2="1" y1="0" y2="0.4">
          <stop offset="0" stopColor="white" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="hc-shade-mask">
          <rect width="260" height="250" fill="url(#hc-shade)" />
        </mask>
      </defs>

      {/* monitor */}
      <rect x="22" y="14" width="216" height="160" rx="12" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" />
      <rect x="22" y="14" width="216" height="160" rx="12" fill="url(#hc-dots)" mask="url(#hc-shade-mask)" />
      <rect x="42" y="32" width="176" height="114" rx="8" fill="var(--color-ink)" />
      <rect x="42" y="32" width="176" height="114" rx="8" fill="url(#hc-dots-fine)" />
      <text x="56" y="62" fill="var(--color-paper)" fontFamily="var(--font-mono)" fontSize="11">
        &gt; најди алатка
      </text>
      <text x="56" y="80" fill="var(--color-mustard)" fontFamily="var(--font-mono)" fontSize="11">
        &gt; спореди
      </text>
      <text x="56" y="98" fill="var(--color-paper)" fontFamily="var(--font-mono)" fontSize="11" opacity="0.8">
        &gt; научи
      </text>
      <rect x="104" y="88" width="7" height="12" fill="var(--color-tomato)" className="motion-safe:animate-pulse" />
      <circle cx="210" cy="160" r="4" fill="var(--color-tomato)" />
      <path d="M40 160h60" stroke="var(--color-ink)" strokeWidth="2" />

      {/* stand */}
      <path d="M104 174h52l10 26H94z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M104 174h52l10 26H94z" fill="url(#hc-dots)" opacity="0.55" />

      {/* keyboard */}
      <path d="M30 206h200l14 32H16z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 12 - row }).map((__, col) => (
          <rect
            key={`${row}-${col}`}
            x={38 + row * 7 + col * 16}
            y={212 + row * 8}
            width="11"
            height="5"
            rx="1"
            fill="var(--color-ink)"
            opacity={0.85 - row * 0.15}
          />
        )),
      )}
    </svg>
  )
}

export function HeroCollage() {
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[30rem] select-none">
      {/* torn cream paper backdrop */}
      <div className="absolute inset-x-[6%] top-[4%] bottom-[10%] rotate-[2deg] bg-cream torn-bottom paper-grain" />

      {/* halftone "sun" */}
      <div
        className="absolute top-[1%] right-[2%] aspect-square w-[46%] rounded-full halftone-coarse"
        style={{ maskImage: 'radial-gradient(circle at 40% 40%, black 30%, transparent 70%)' }}
      />

      <RegistrationMark className="absolute top-0 left-[3%] h-5 w-5 text-ink/70" />
      <RegistrationMark className="absolute right-0 bottom-[7%] h-5 w-5 text-ink/70" />

      {/* cut-out computer */}
      <div
        className="absolute top-[11%] left-[8%] w-[80%] -rotate-[3deg]"
        style={{
          filter:
            'drop-shadow(4px 0 0 var(--color-paper)) drop-shadow(-4px 0 0 var(--color-paper)) drop-shadow(0 4px 0 var(--color-paper)) drop-shadow(0 -4px 0 var(--color-paper)) drop-shadow(6px 8px 0 rgb(27 23 20 / 0.18))',
        }}
      >
        <RetroComputer className="h-auto w-full" />
      </div>

      {/* catalogue index card */}
      <div className="absolute bottom-[3%] left-0 w-[64%] rotate-[-5deg] border border-ink/40 bg-white px-4 pt-5 pb-3 shadow-paper ruled">
        <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[3deg] bg-mustard/75" />
        <span aria-hidden className="absolute inset-y-0 left-7 w-px bg-tomato/60" />
        <dl className="relative space-y-[3px] pl-6 font-mono text-[0.625rem] leading-[21px] tracking-wide uppercase sm:text-[0.6875rem]">
          <div className="flex gap-2">
            <dt className="text-graphite">Каталог</dt>
            <dd className="font-medium">№ 0001</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-graphite">Предмет</dt>
            <dd className="font-medium">AI алатки</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-graphite">Оддели</dt>
            <dd className="font-medium normal-case">текст · слики · видео · код</dd>
          </div>
        </dl>
        <span aria-hidden className="absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 rounded-full border border-ink/40 bg-paper" />
      </div>

      <Stamp className="absolute right-[2%] bottom-[20%] h-[26%] w-[26%] rotate-[-14deg] opacity-90 mix-blend-multiply" />
    </div>
  )
}

/** Margin note that links to the discovery wizard. */
export function HeroAnnotation() {
  return (
    <Link
      to="/pronajdi"
      className="group inline-flex items-start gap-2 font-hand text-[1.45rem] leading-6 text-ink hover:text-tomato-ink"
    >
      <svg viewBox="0 0 60 40" className="mt-1 h-7 w-10 shrink-0 text-tomato" aria-hidden>
        <path d="M4 6c14 2 28 10 38 26M42 32l-1-11M42 32l-11-2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span>
        не знаеш што бараш?
        <br />
        <span className="underline decoration-tomato decoration-2 underline-offset-4">пробај го прашалникот</span>
      </span>
    </Link>
  )
}
