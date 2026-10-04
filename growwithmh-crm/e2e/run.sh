#!/usr/bin/env bash
# Full browser E2E suite, one command, no manual steps:
#   npm run e2e          (from growwithmh-crm/)   or   bash e2e/run.sh
#   E2E_ONLY=02 npm run e2e     one scenario        E2E_REVERSE=1 npm run e2e     reverse order
#
# For EVERY scenario the database is dropped and rebuilt from the real migrations (+ that scenario's fixture, if any),
# PostgREST is restarted against it and uploaded files are wiped — so scenarios are independent and order-agnostic.
# Needs: node, curl, psql, a PostgreSQL server install (see cluster.sh), and a Chromium (see config.mjs).
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
source "$E2E_ROOT/cluster.sh"
cd "$E2E_ROOT"

PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; cluster_down; }
trap cleanup EXIT
die() { echo "E2E setup failed: $*" >&2; exit 2; }

mkdir -p "$E2E_TMP"
[ -d node_modules/playwright-core ] || npm install --no-audit --no-fund --silent >/dev/null || die "npm install (playwright-core)"
cluster_up || die "postgres"
PGRST="$(postgrest_bin)" || die "could not obtain PostgREST"

GATEWAY_URL="http://127.0.0.1:$E2E_GATEWAY_PORT"
echo "› building the app (production build, pointed at the local gateway)"
( cd "$APP_ROOT" && VITE_SUPABASE_URL="$GATEWAY_URL" VITE_SUPABASE_ANON_KEY="anon-e2e" npx vite build --outDir "$E2E_TMP/dist" --emptyOutDir >"$E2E_TMP/build.log" 2>&1 ) || { cat "$E2E_TMP/build.log"; die "app build"; }

cat >"$E2E_TMP/postgrest.conf" <<CONF
db-uri = "postgres://authenticator:pw@127.0.0.1:$E2E_PG_PORT/$E2E_DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$E2E_JWT_SECRET"
server-host = "127.0.0.1"
server-port = $E2E_REST_PORT
db-pool = 5
CONF

node servers.mjs >"$E2E_TMP/servers.log" 2>&1 & PIDS+=("$!")
PGRST_PID=""
start_postgrest() {
  [ -n "$PGRST_PID" ] && kill "$PGRST_PID" 2>/dev/null && wait "$PGRST_PID" 2>/dev/null
  "$PGRST" "$E2E_TMP/postgrest.conf" >"$E2E_TMP/postgrest.log" 2>&1 & PGRST_PID=$!; PIDS+=("$PGRST_PID")
  for _ in $(seq 1 60); do curl -fs -o /dev/null "http://127.0.0.1:$E2E_REST_PORT/" && return 0; sleep 0.25; done
  die "PostgREST did not become ready (see $E2E_TMP/postgrest.log)"
}
for _ in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$E2E_APP_PORT/" && break; sleep 0.25; done

declare -a NAMES PASSED FAILED STATUS
total_pass=0; total_fail=0; broken=0
# E2E_ONLY=02 runs just matching scenarios; E2E_REVERSE=1 runs them last-to-first (proves order independence)
SCENARIOS=()
for f in "$E2E_ROOT"/scenarios/*${E2E_ONLY:-}*.mjs; do [ -e "$f" ] && SCENARIOS+=("$f"); done
[ "${#SCENARIOS[@]}" -gt 0 ] || die "no scenario matches E2E_ONLY=${E2E_ONLY:-}"
if [ "${E2E_REVERSE:-0}" = 1 ]; then
  REV=(); for ((i=${#SCENARIOS[@]}-1; i>=0; i--)); do REV+=("${SCENARIOS[$i]}"); done; SCENARIOS=("${REV[@]}")
fi
for scenario in "${SCENARIOS[@]}"; do
  name="$(basename "$scenario" .mjs)"
  fixture="$E2E_ROOT/fixtures/$name.sql"
  echo; echo "━━ $name ━━"
  "$E2E_ROOT/db/reset.sh" $([ -f "$fixture" ] && echo "$fixture") || die "database reset for $name"
  start_postgrest
  rm -rf "$E2E_TMP/storage" "$E2E_TMP/shots"; mkdir -p "$E2E_TMP/storage" "$E2E_TMP/shots"
  log="$E2E_TMP/$name.log"
  timeout "${E2E_SCENARIO_TIMEOUT:-300}" node "$scenario" 2>&1 | tee "$log"
  code=${PIPESTATUS[0]}
  verdict="$(grep -E '^[0-9]+ passed, [0-9]+ failed' "$log" | tail -1)"
  p="$(echo "$verdict" | sed -E 's/^([0-9]+) passed.*/\1/')"; f="$(echo "$verdict" | sed -E 's/.* ([0-9]+) failed.*/\1/')"
  if [ -z "$verdict" ]; then p=0; f=1; code=99; fi          # crashed before reporting = failure
  NAMES+=("$name"); PASSED+=("$p"); FAILED+=("$f"); STATUS+=("$code")
  total_pass=$((total_pass + p)); total_fail=$((total_fail + f)); [ "$code" != 0 ] && broken=1
done

echo; echo "━━ E2E summary ━━"
printf '%-40s %8s %8s\n' scenario passed failed
for i in "${!NAMES[@]}"; do printf '%-40s %8s %8s%s\n' "${NAMES[$i]}" "${PASSED[$i]}" "${FAILED[$i]}" "$([ "${STATUS[$i]}" != 0 ] && echo "   (exit ${STATUS[$i]})")"; done
printf '%-40s %8s %8s\n' TOTAL "$total_pass" "$total_fail"
if [ "$broken" = 0 ] && [ "$total_fail" = 0 ]; then echo "E2E RESULT: PASS"; exit 0; fi
echo "E2E RESULT: FAIL"; exit 1
