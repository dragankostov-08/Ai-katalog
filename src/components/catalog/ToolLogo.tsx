import { useState } from 'react'

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg md:h-20 md:w-20 md:text-xl',
}

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

/** Shows the verified logo when one exists, otherwise a typographic monogram stamp. */
export function ToolLogo({ name, src, size = 'md' }: { name: string; src?: string | null; size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false)
  const box = `${sizes[size]} shrink-0 border border-ink/80 bg-white`

  if (src && !failed) {
    return (
      <span className={`${box} inline-flex items-center justify-center overflow-hidden p-1`}>
        <img
          src={src}
          alt={`Лого на ${name}`}
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    )
  }

  return (
    <span aria-hidden className={`${box} relative inline-flex items-center justify-center bg-cream font-mono font-medium text-ink`}>
      {initials(name)}
      <span className="absolute right-0.5 bottom-0.5 h-1 w-1 bg-tomato" />
    </span>
  )
}
