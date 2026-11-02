import { useState } from 'react'

const sizes = {
  sm: 'h-9 w-9 text-xs rounded-lg',
  md: 'h-12 w-12 text-sm rounded-xl',
  lg: 'h-16 w-16 text-lg rounded-2xl md:h-20 md:w-20 md:text-xl',
}

const GRADIENTS = [
  'linear-gradient(135deg,#8b5cf6,#6366f1)',
  'linear-gradient(135deg,#0ea5e9,#06b6d4)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#d946ef,#a855f7)',
]

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

function hash(text: string) {
  let value = 0
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0
  return value
}

/** Verified logo when one exists, otherwise a colourful monogram tile. */
export function ToolLogo({ name, src, size = 'md' }: { name: string; src?: string | null; size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <span className={`${sizes[size]} inline-flex shrink-0 items-center justify-center overflow-hidden border border-light bg-white p-1 rounded-2xl`}>
        <img src={src} alt={`Лого на ${name}`} width={80} height={80} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </span>
    )
  }

  const gradient = GRADIENTS[hash(name) % GRADIENTS.length]
  return (
    <span aria-hidden className={`${sizes[size]} inline-flex shrink-0 items-center justify-center font-bold text-white shadow-sm`} style={{ backgroundImage: gradient }}>
      {initials(name)}
    </span>
  )
}
