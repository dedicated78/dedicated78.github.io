# Shared configuration for the E2E scripts (sourced by run.sh, db/reset.sh, run-sql-tests.sh). Override via environment.
E2E_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$E2E_ROOT/.." && pwd)"
export E2E_ROOT APP_ROOT
export E2E_TMP="${E2E_TMP:-$E2E_ROOT/.tmp}"
export E2E_CACHE="${E2E_CACHE:-$E2E_ROOT/.cache}"
export E2E_PG_PORT="${E2E_PG_PORT:-54329}"
export E2E_PG_SOCKET_DIR="${E2E_PG_SOCKET_DIR:-/tmp}"
export E2E_PG_DATA="${E2E_PG_DATA:-/var/tmp/growwithmh-crm-e2e-pg}"
export E2E_DB="${E2E_DB:-crm_e2e}"
export E2E_REST_PORT="${E2E_REST_PORT:-54330}"
export E2E_GATEWAY_PORT="${E2E_GATEWAY_PORT:-54321}"
export E2E_APP_PORT="${E2E_APP_PORT:-4173}"
export E2E_JWT_SECRET="${E2E_JWT_SECRET:-e2e-secret-e2e-secret-e2e-secret-1234}"
export POSTGREST_VERSION="${POSTGREST_VERSION:-v12.2.3}"

# Postgres binaries (initdb/pg_ctl) — first match wins
if [ -z "${E2E_PG_BIN:-}" ]; then
  for d in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin /opt/homebrew/opt/postgresql*/bin /usr/local/opt/postgresql*/bin; do
    [ -x "$d/pg_ctl" ] && E2E_PG_BIN="$d"
  done
fi
export E2E_PG_BIN="${E2E_PG_BIN:-}"

# superuser connection used by every script (the throw-away cluster is created with `trust` auth and user "postgres")
psql_admin() { psql -h "$E2E_PG_SOCKET_DIR" -p "$E2E_PG_PORT" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
