import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'
import { ConfigError } from './rest'

let client: SupabaseClient | null = null

/**
 * Full Supabase SDK, used by the admin area (auth, storage, RPC with a user
 * session). Public pages never import this module statically.
 */
export function getSupabase(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseKey) throw new ConfigError()
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: false,
      },
    })
  }
  return client
}

export async function getAccessToken(): Promise<string | undefined> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.access_token
}
