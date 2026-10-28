// LOCAL TESTING ONLY — a minimal stand-in for the Supabase REST (RPC) and Auth
// endpoints, backed by a local PostgreSQL database with the real migrations.
// It lets the app, the pre-renderer and end-to-end tests run against the real
// SQL functions and Row Level Security without a Supabase project.
// Never expose this server publicly.
//
//   DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_katalog_local node scripts/local-api.mjs
import crypto from 'node:crypto'
import http from 'node:http'
import pg from 'pg'

const PORT = Number(process.env.PORT || 54321)
const SECRET = process.env.LOCAL_JWT_SECRET || 'local-development-secret-not-for-production'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_katalog_local' })
const refreshTokens = new Map()
// Idle connections are terminated when the local database is recreated; log
// instead of crashing so the server keeps working against the new database.
pool.on('error', (error) => console.warn('[local-api] idle database connection closed:', error.message))

const b64url = (value) => Buffer.from(value).toString('base64url')

function signJwt(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyJwt(token) {
  const [header, body, signature] = token.split('.')
  if (!signature) return null
  const expected = Buffer.from(crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url'))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (claims.exp && claims.exp < Date.now() / 1000) return null
  return claims
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info, accept-profile, content-profile, prefer, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

function claimsFrom(req) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return { role: 'anon' }
  return verifyJwt(auth.slice(7)) ?? { role: 'anon' }
}

async function issueSession(user) {
  const now = Math.floor(Date.now() / 1000)
  const access_token = signJwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 })
  const refresh_token = crypto.randomBytes(24).toString('hex')
  refreshTokens.set(refresh_token, user)
  return {
    access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token,
    user: { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: user.created_at },
  }
}

async function handleRpc(req, res, fn) {
  if (!/^[a-z_][a-z0-9_]*$/.test(fn)) return send(res, 404, { code: 'PGRST202', message: 'Unknown function' })
  const args = await readBody(req)
  const names = Object.keys(args)
  if (names.some((name) => !/^[a-z_][a-z0-9_]*$/.test(name))) return send(res, 400, { code: 'PGRST100', message: 'Invalid argument name' })
  const claims = claimsFrom(req)
  const role = claims.role === 'authenticated' ? 'authenticated' : 'anon'
  const values = names.map((name) => {
    const value = args[name]
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(value) : Array.isArray(value) && value.some((v) => typeof v === 'object') ? JSON.stringify(value) : value
  })
  const sql = `select public.${fn}(${names.map((name, i) => `${name} => $${i + 1}`).join(', ')}) as result`
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${role}`)
    await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.headers', $2, true)", [
      JSON.stringify(claims),
      JSON.stringify({ 'x-forwarded-for': req.socket.remoteAddress ?? '127.0.0.1' }),
    ])
    const result = await client.query(sql, values)
    await client.query('commit')
    send(res, 200, result.rows[0]?.result ?? null)
  } catch (error) {
    await client.query('rollback').catch(() => {})
    const status = error.code === '42501' ? (role === 'anon' ? 401 : 403) : error.code === '42883' ? 404 : 400
    send(res, status, { code: error.code, message: error.message, details: error.detail ?? null, hint: error.hint ?? null })
  } finally {
    client.release()
  }
}

async function handleAuth(req, res, url) {
  if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
    const body = await readBody(req)
    const grant = url.searchParams.get('grant_type')
    if (grant === 'password') {
      const hash = crypto.createHash('sha256').update(String(body.password ?? '')).digest('hex')
      const { rows } = await pool.query('select id, email, created_at from auth.users where lower(email) = lower($1) and encrypted_password = $2', [body.email ?? '', hash])
      if (!rows[0]) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials' })
      return send(res, 200, await issueSession(rows[0]))
    }
    if (grant === 'refresh_token') {
      const user = refreshTokens.get(body.refresh_token)
      if (!user) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' })
      refreshTokens.delete(body.refresh_token)
      return send(res, 200, await issueSession(user))
    }
    return send(res, 400, { error: 'unsupported_grant_type' })
  }
  if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
    const claims = claimsFrom(req)
    if (claims.role !== 'authenticated') return send(res, 401, { message: 'invalid JWT' })
    return send(res, 200, { id: claims.sub, aud: 'authenticated', role: 'authenticated', email: claims.email, app_metadata: { provider: 'email' }, user_metadata: {} })
  }
  if (url.pathname === '/auth/v1/logout') return send(res, 204)
  return send(res, 404, { message: 'Not supported by the local API' })
}

http
  .createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204)
      const url = new URL(req.url, `http://localhost:${PORT}`)
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)
      if (rpc && req.method === 'POST') return await handleRpc(req, res, rpc[1])
      if (url.pathname.startsWith('/auth/v1/')) return await handleAuth(req, res, url)
      send(res, 501, { message: `The local API only emulates RPC and password auth (${req.method} ${url.pathname}).` })
    } catch (error) {
      send(res, 500, { message: String(error) })
    }
  })
  .listen(PORT, () => console.log(`[local-api] listening on http://localhost:${PORT} (testing only)`))
