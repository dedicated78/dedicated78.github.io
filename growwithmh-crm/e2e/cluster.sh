# Throw-away local Postgres cluster + PostgREST helpers (sourced by run.sh / run-sql-tests.sh).
# Uses an already-running server on E2E_PG_PORT if there is one, otherwise creates and starts a private cluster
# (and stops it again on exit). Postgres refuses to run as root, so when root we hand the cluster to the `postgres` OS user.

_as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
_pg_ready() { pg_isready -q -h "$E2E_PG_SOCKET_DIR" -p "$E2E_PG_PORT"; }
E2E_CLUSTER_STARTED=0

cluster_up() {
  if _pg_ready; then return 0; fi
  [ -n "$E2E_PG_BIN" ] || { echo "PostgreSQL server binaries not found. Install postgresql or set E2E_PG_BIN=/path/to/bin." >&2; return 1; }
  if [ ! -f "$E2E_PG_DATA/PG_VERSION" ]; then
    mkdir -p "$E2E_PG_DATA"; [ "$(id -u)" = 0 ] && chown postgres "$E2E_PG_DATA"
    _as_pg "'$E2E_PG_BIN/initdb' -D '$E2E_PG_DATA' -U postgres -A trust --no-sync >/dev/null"
  fi
  rm -f "$E2E_PG_DATA/postmaster.pid"   # stale after a container restart (we only get here when nothing answers on the port)
  _as_pg "'$E2E_PG_BIN/pg_ctl' -D '$E2E_PG_DATA' -o '-p $E2E_PG_PORT -k $E2E_PG_SOCKET_DIR' -l '$E2E_PG_DATA.log' -w start >/dev/null"
  E2E_CLUSTER_STARTED=1
}

cluster_down() {
  if [ "$E2E_CLUSTER_STARTED" = 1 ]; then _as_pg "'$E2E_PG_BIN/pg_ctl' -D '$E2E_PG_DATA' -m fast stop >/dev/null" || true; fi
}

# PostgREST static binary (Linux x86-64), cached under e2e/.cache
postgrest_bin() {
  if [ -n "${E2E_POSTGREST:-}" ]; then echo "$E2E_POSTGREST"; return; fi
  local bin="$E2E_CACHE/postgrest-$POSTGREST_VERSION"
  if [ ! -x "$bin" ]; then
    mkdir -p "$E2E_CACHE"
    local tmp; tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/pgrst.tar.xz" "https://github.com/PostgREST/postgrest/releases/download/$POSTGREST_VERSION/postgrest-$POSTGREST_VERSION-linux-static-x64.tar.xz"
    tar -xJf "$tmp/pgrst.tar.xz" -C "$tmp"
    mv "$tmp/postgrest" "$bin"; chmod +x "$bin"; rm -rf "$tmp"
  fi
  echo "$bin"
}
