import { createLocalStore } from './store'

type Progress = Record<string, string[]>

const store = createLocalStore<Progress>('aik-path-progress', {}, (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const clean: Progress = {}
  for (const [path, steps] of Object.entries(value as Record<string, unknown>)) {
    if (/^[a-z0-9-]{1,80}$/.test(path) && Array.isArray(steps)) {
      clean[path] = steps.filter((s): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s)).slice(0, 200)
    }
  }
  return clean
})

export const useProgress = store.useValue

export function toggleStep(path: string, stepId: string) {
  const current = store.read()
  const done = current[path] ?? []
  store.write({ ...current, [path]: done.includes(stepId) ? done.filter((s) => s !== stepId) : [...done, stepId] })
}

export function resetProgress(path: string) {
  const current = { ...store.read() }
  delete current[path]
  store.write(current)
}
