#!/usr/bin/env bash
# Applies the migrations and seed to a throwaway PostgreSQL database and runs
# the security tests. Requires a superuser connection to a local server, e.g.
#   ADMIN_DATABASE_URL=postgres://postgres@localhost:5432/postgres ./scripts/test-db.sh
# Never point this at a Supabase project: it creates and drops a database.
set -euo pipefail

ADMIN_URL="${ADMIN_DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
DB_NAME="${TEST_DB_NAME:-ai_katalog_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_URL="${ADMIN_URL%/*}/${DB_NAME}"

psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists ${DB_NAME}" -c "create database ${DB_NAME}"

psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/supabase_shim.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  PGOPTIONS='-c client_min_messages=warning' psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$migration"
done
PGOPTIONS='-c client_min_messages=warning' psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"
set +e
psql "$TEST_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/security_test.sql" 2>&1 | grep -E "ok - |FAIL|ERROR|passed"
status=${PIPESTATUS[0]}
set -e

if [ "${KEEP_TEST_DB:-0}" != "1" ]; then
  psql "$ADMIN_URL" -q -c "drop database if exists ${DB_NAME}"
fi
exit "$status"
