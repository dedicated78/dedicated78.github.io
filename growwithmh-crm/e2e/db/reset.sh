#!/usr/bin/env bash
# Drop and recreate the E2E database from scratch: stub Supabase schemas → the real migrations → the three users
# → optional scenario fixture. Every scenario starts from exactly this state.
#   db/reset.sh [fixture.sql]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"

psql_admin -d postgres -c "drop database if exists $E2E_DB with (force)" -c "create database $E2E_DB" >/dev/null
psql_admin -d "$E2E_DB" -f "$E2E_ROOT/db/stub.sql" >/dev/null
for f in "$APP_ROOT"/supabase/migrations/*.sql; do
  psql_admin -d "$E2E_DB" -f "$f" >/dev/null
done
psql_admin -d "$E2E_DB" -f "$E2E_ROOT/db/users.sql" >/dev/null
if [ -n "${1:-}" ]; then
  psql_admin -d "$E2E_DB" -f "$1" >/dev/null
fi
