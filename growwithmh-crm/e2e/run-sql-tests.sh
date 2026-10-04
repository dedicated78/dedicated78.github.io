#!/usr/bin/env bash
# Authorization regression test (supabase/tests/rls_test.sql) against a scratch database built from the real migrations.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
source "$E2E_ROOT/cluster.sh"
cluster_up
trap cluster_down EXIT
DB=crm_rls_test
psql_admin -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null
psql_admin -d $DB -f "$E2E_ROOT/db/stub.sql" >/dev/null
for f in "$APP_ROOT"/supabase/migrations/*.sql; do psql_admin -d $DB -f "$f" >/dev/null; done
out=$(psql -h "$E2E_PG_SOCKET_DIR" -p "$E2E_PG_PORT" -U postgres -d $DB -q -f "$APP_ROOT/supabase/tests/rls_test.sql" 2>&1 || true)
verdict=$(echo "$out" | grep -E "RLS TESTS (PASSED|FAILED)" | head -1 | sed -E 's/^.*ERROR:  //')
echo "$out" | grep -E "NOTICE:  FAIL" | sed -E 's/^.*NOTICE:  /  /' || true
echo "${verdict:-RLS TESTS DID NOT COMPLETE}"
psql_admin -d postgres -c "drop database if exists $DB with (force)" >/dev/null
[[ "$verdict" == *PASSED* ]]
