/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Refuse to build when a privileged key would end up in the client bundle.
function assertPublicKey(key: string | undefined) {
  if (!key) return
  if (key.startsWith('sb_secret_')) {
    throw new Error('VITE_SUPABASE_ANON_KEY contains a secret key. Use the publishable/anon key instead.')
  }
  const payload = key.split('.')[1]
  if (payload) {
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
      if (claims.role === 'service_role') {
        throw new Error('VITE_SUPABASE_ANON_KEY is a service_role key. Never expose it to the browser.')
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('service_role')) throw error
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  assertPublicKey(env.VITE_SUPABASE_ANON_KEY)

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      rolldownOptions: {
        output: {
          // Framework code changes rarely: keep it in its own long-cached chunk.
          codeSplitting: {
            groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser)[\\/]/ }],
          },
        },
      },
    },
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      environment: 'node',
    },
  }
})
