#!/usr/bin/env bash
# LOCAL DEVELOPMENT ONLY. Creates a throwaway database with the Supabase shim,
# all migrations and the seed, plus two local test accounts:
#   admin@local.test / local-admin   (role: admin)
#   editor@local.test / local-editor (role: editor)
#
#   ./scripts/local-db.sh                 # seed content stays in review
#   ./scripts/local-db.sh --publish-seed  # publish seed content for UI testing
#
# --publish-seed marks the unverified starter content as published so the UI
# can be exercised. It never marks anything as verified and must not be used
# against a real project.
set -euo pipefail

ADMIN_URL="${ADMIN_DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
DB_NAME="${LOCAL_DB_NAME:-ai_katalog_local}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${ADMIN_URL%/*}/${DB_NAME}"
export PGOPTIONS='-c client_min_messages=warning'

psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists ${DB_NAME} with (force)" -c "create database ${DB_NAME}"
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/supabase_shim.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$migration"
done
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"

psql "$DB_URL" -q -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (id, email, encrypted_password) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@local.test', encode(sha256('local-admin'), 'hex')),
  ('00000000-0000-0000-0000-0000000000e1', 'editor@local.test', encode(sha256('local-editor'), 'hex'));
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-0000000000e1', 'editor');
SQL

if [ "${1:-}" = "--publish-seed" ]; then
  psql "$DB_URL" -q -v ON_ERROR_STOP=1 <<'SQL'
update public.tools set status = 'published', is_featured = slug in ('chatgpt', 'canva', 'perplexity', 'notebooklm');
update public.articles set status = 'published';
update public.collections set status = 'published';
update public.comparisons set status = 'published';
SQL
  echo "Seed content published (still unverified) in ${DB_NAME}."
fi

echo "Local database ready: ${DB_URL}"
