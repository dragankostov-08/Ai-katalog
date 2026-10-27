import { useRef } from 'react'

/** Time since the form was rendered — submissions faster than a human are discarded server-side. */
export function useFormTimer() {
  const startedAt = useRef<number | null>(null)
  if (startedAt.current === null && typeof performance !== 'undefined') startedAt.current = performance.now()
  return () => Math.round(performance.now() - (startedAt.current ?? performance.now()))
}
