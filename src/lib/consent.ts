import { createLocalStore } from './store'

export interface ConsentState {
  version: 1
  decided: boolean
  analytics: boolean
  advertising: boolean
  decidedAt: string | null
}

const UNDECIDED: ConsentState = { version: 1, decided: false, analytics: false, advertising: false, decidedAt: null }

const store = createLocalStore<ConsentState>('aik-consent', UNDECIDED, (value) => {
  const v = value as Partial<ConsentState> | null
  if (!v || v.version !== 1 || typeof v.decided !== 'boolean') return null
  return { version: 1, decided: v.decided, analytics: !!v.analytics, advertising: !!v.advertising, decidedAt: v.decidedAt ?? null }
})

export const useConsent = store.useValue
export const readConsent = store.read

export function saveConsent(choice: { analytics: boolean; advertising: boolean }) {
  store.write({ version: 1, decided: true, ...choice, decidedAt: new Date().toISOString() })
}

const openListeners = new Set<() => void>()

/** Lets the footer link re-open the consent preferences dialog. */
export function openConsentPreferences() {
  openListeners.forEach((listener) => listener())
}

export function onOpenConsentPreferences(listener: () => void) {
  openListeners.add(listener)
  return () => {
    openListeners.delete(listener)
  }
}
