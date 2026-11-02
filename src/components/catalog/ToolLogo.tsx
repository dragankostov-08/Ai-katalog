import { useState } from 'react'

const sizes = {
  sm: 'h-9 w-9 text-xs rounded-lg',
  md: 'h-12 w-12 text-sm rounded-xl',
  lg: 'h-16 w-16 text-lg rounded-2xl md:h-20 md:w-20 md:text-xl',
}

// Muted letter tints for the monogram tiles (no gradients, no glow).
const TINTS = ['#c7d2fe', '#bae6fd', '#a7f3d0', '#fde68a', '#fbcfe8', '#e9d5ff', '#e5e7eb']

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

function hash(text: string) {
  let value = 0
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0
  return value
}

/** Verified logo when one exists, otherwise a glass monogram tile. */
export function ToolLogo({ name, src, size = 'md' }: { name: string; src?: string | null; size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <span className={`${sizes[size]} inline-flex shrink-0 items-center justify-center overflow-hidden border border-light bg-white p-1`}>
        <img src={src} alt={`Лого на ${name}`} width={80} height={80} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </span>
    )
  }

  const tint = TINTS[hash(name) % TINTS.length]
  return (
    <span
      aria-hidden
      className={`${sizes[size]} inline-flex shrink-0 items-center justify-center border border-light bg-cream font-semibold tracking-tight shadow-sm`}
      style={{ color: tint }}
    >
      {initials(name)}
    </span>
  )
}
