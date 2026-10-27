import { useSyncExternalStore } from 'react'

/**
 * Tiny localStorage-backed store with cross-tab sync. The server snapshot is
 * always the fallback so that pre-rendered HTML hydrates without mismatches.
 */
export function createLocalStore<T>(key: string, fallback: T, validate: (value: unknown) => T | null) {
  const listeners = new Set<() => void>()
  let cache: T = fallback
  let loaded = false

  function read(): T {
    if (typeof window === 'undefined') return fallback
    if (!loaded) {
      loaded = true
      try {
        const raw = window.localStorage.getItem(key)
        cache = raw ? (validate(JSON.parse(raw)) ?? fallback) : fallback
      } catch {
        cache = fallback
      }
    }
    return cache
  }

  function write(value: T) {
    cache = value
    loaded = true
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be unavailable (private mode); keep the in-memory value.
    }
    listeners.forEach((listener) => listener())
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        loaded = false
        listener()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback)
  }

  return { read, write, subscribe, useValue }
}
