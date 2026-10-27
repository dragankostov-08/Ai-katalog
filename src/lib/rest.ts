import { env } from './env'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export class ConfigError extends Error {
  constructor() {
    super('Базата на податоци не е конфигурирана (недостасуваат VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY).')
    this.name = 'ConfigError'
  }
}

interface RpcOptions {
  signal?: AbortSignal
  /** User access token. Only sent for staff preview and admin calls. */
  accessToken?: string
  keepalive?: boolean
}

/**
 * Calls a Postgres function through the Supabase REST API (PostgREST).
 * Public pages use this thin wrapper instead of supabase-js to keep the
 * client bundle small; only the admin area loads the full SDK.
 */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, options: RpcOptions = {}): Promise<T> {
  if (!env.supabaseUrl || !env.supabaseKey) throw new ConfigError()

  const headers: Record<string, string> = {
    apikey: env.supabaseKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`

  let response: Response
  try {
    response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
      signal: options.signal,
      keepalive: options.keepalive,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Не може да се воспостави врска со серверот. Провери ја интернет-врската.', 0)
  }

  const text = await response.text()
  const body: unknown = text ? JSON.parse(text) : null

  if (!response.ok) {
    const detail = (body ?? {}) as { message?: string; code?: string }
    throw new ApiError(detail.message || `Грешка ${response.status}`, response.status, detail.code)
  }
  return body as T
}
