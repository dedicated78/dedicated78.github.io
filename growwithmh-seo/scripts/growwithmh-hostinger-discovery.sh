#!/usr/bin/env bash
# growwithmh-hostinger-discovery.sh
#
# READ-ONLY Hostinger infrastructure discovery for the GrowwithMH SEO platform.
#
# WHAT IT DOES
#   Inspects the host and prints a sanitized report between two markers.
#
# WHAT IT NEVER DOES
#   - install, update, remove, start, stop, restart or reconfigure anything
#   - run sudo, or attempt any privilege escalation
#   - write anywhere except /tmp (one ephemeral bind-test socket)
#   - print secrets: passwords, keys, tokens, credentials, certificates, or the
#     VALUE of any environment variable. Only SET / not set is ever reported.
#   - contact DataForSEO or any paid provider
#
# The only thing it creates is a momentary TCP listener on a high port to test
# bind capability; it is closed immediately and nothing is left behind.
#
# Usage:  bash growwithmh-hostinger-discovery.sh
# Safe to run repeatedly.

# Deliberately NOT `set -e`: discovery must continue past every missing tool.
set -uo pipefail
export LC_ALL=C

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Capability flags, filled in as we go and summarised at the end.
CAP_DOCKER="UNKNOWN"
CAP_NODE_PERSIST="UNKNOWN"
CAP_PG_LOCAL="UNKNOWN"
CAP_PG_EXTERNAL="UNKNOWN"
CAP_CRON="UNKNOWN"
CAP_PROXY="UNKNOWN"
CAP_RAM="UNKNOWN"

RAM_TOTAL_MB=0
SWAP_TOTAL_MB=0

section() {
  printf '\n--- %s %s\n' "$1" "$(printf '%.0s-' $(seq 1 $((66 - ${#1}))))"
}

kv() { printf '  %-34s %s\n' "$1" "${2:-unknown}"; }

have() { command -v "$1" >/dev/null 2>&1; }

# Runs a command with a timeout, returns its first line, never fails the script.
# Stderr is discarded so a tool's own error text cannot leak into the report.
soft() {
  local t=6
  if have timeout; then
    timeout "$t" "$@" 2>/dev/null | head -n 1
  else
    "$@" 2>/dev/null | head -n 1
  fi
}

# Reports a tool's version, or that it is absent.
tool() {
  local label="$1"
  shift
  if have "$1"; then
    local out
    out="$(soft "$@")"
    kv "$label" "${out:-present (version unreadable)}"
    return 0
  fi
  kv "$label" "not installed"
  return 1
}

# Existence-only environment check. NEVER prints the value.
envcheck() {
  if [ -n "${!1:-}" ]; then
    printf '  %-34s %s\n' "$1" "SET (value not shown)"
  else
    printf '  %-34s %s\n' "$1" "not set"
  fi
}

# TCP reachability probe.
#   open    = connected, egress on this port works
#   refused = reached the host, nothing listening -> egress on this port works
#   blocked = timed out -> likely filtered outbound
probe_tcp() {
  local host="$1" port="$2" t="${3:-5}"
  if have timeout; then
    if timeout "$t" bash -c "exec 3<>/dev/tcp/${host}/${port}" 2>/dev/null; then
      echo "open"
      return
    fi
    local rc=$?
    [ "$rc" -eq 124 ] && { echo "blocked (timeout)"; return; }
    echo "refused/unreachable"
    return
  fi
  echo "unknown (no timeout command)"
}

bytes_to_mb() {
  local v="${1:-0}"
  [ -z "$v" ] && v=0
  echo $((v / 1024 / 1024))
}

echo "===== GROWWITHMH HOSTINGER DISCOVERY START ====="
echo "generated_at (UTC): $(date -u '+%Y-%m-%d %H:%M:%S' 2>/dev/null)"
echo "script_version:     1.2"
echo "mode:               read-only"

# ---------------------------------------------------------------------------
section "SYSTEM"
# ---------------------------------------------------------------------------

kv "hostname" "$(hostname 2>/dev/null || cat /etc/hostname 2>/dev/null)"

if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release 2>/dev/null
  kv "distribution" "${PRETTY_NAME:-${NAME:-unknown}}"
  kv "os_id / version" "${ID:-?} / ${VERSION_ID:-?}"
else
  kv "distribution" "/etc/os-release unreadable"
fi

kv "kernel" "$(uname -r 2>/dev/null)"
kv "architecture" "$(uname -m 2>/dev/null)"
kv "virtualisation" "$(soft systemd-detect-virt)"

if [ -r /proc/cpuinfo ]; then
  kv "cpu_model" "$(grep -m1 -E 'model name|Model' /proc/cpuinfo 2>/dev/null | cut -d: -f2- | sed 's/^ *//')"
  kv "cpu_cores_visible" "$(grep -c '^processor' /proc/cpuinfo 2>/dev/null)"
fi
kv "nproc" "$(soft nproc)"

if [ -r /proc/meminfo ]; then
  mem_total_kb="$(awk '/^MemTotal:/{print $2}' /proc/meminfo 2>/dev/null)"
  mem_avail_kb="$(awk '/^MemAvailable:/{print $2}' /proc/meminfo 2>/dev/null)"
  swap_total_kb="$(awk '/^SwapTotal:/{print $2}' /proc/meminfo 2>/dev/null)"
  RAM_TOTAL_MB=$(( ${mem_total_kb:-0} / 1024 ))
  SWAP_TOTAL_MB=$(( ${swap_total_kb:-0} / 1024 ))
  kv "ram_total" "${RAM_TOTAL_MB} MB"
  kv "ram_available" "$(( ${mem_avail_kb:-0} / 1024 )) MB"
  kv "swap_total" "${SWAP_TOTAL_MB} MB"
fi

echo
echo "  filesystems (df -hT, local mounts):"
if have df; then
  df -hTP 2>/dev/null | grep -vE 'tmpfs|devtmpfs|overlay.*/var/lib/docker' | head -n 12 | sed 's/^/    /'
fi
echo
kv "home_directory" "$HOME"
kv "home_free_space" "$(df -hP "$HOME" 2>/dev/null | awk 'NR==2{print $4" free of "$2}')"
kv "current_user" "$(id -un 2>/dev/null) (uid $(id -u 2>/dev/null))"
kv "is_root" "$([ "$(id -u 2>/dev/null)" = "0" ] && echo yes || echo no)"
kv "shell" "${SHELL:-unknown}"

# ---------------------------------------------------------------------------
section "CONTAINER / RESOURCE LIMITS"
# ---------------------------------------------------------------------------

if [ -f /.dockerenv ]; then
  kv "inside_container" "yes (/.dockerenv present)"
elif grep -qaE 'docker|lxc|containerd' /proc/1/cgroup 2>/dev/null; then
  kv "inside_container" "likely (cgroup hints)"
else
  kv "inside_container" "no obvious container markers"
fi

# cgroup v2 then v1.
CG_LIMIT_READABLE="yes"
if [ -r /sys/fs/cgroup/memory.max ]; then
  cg_mem="$(cat /sys/fs/cgroup/memory.max 2>/dev/null)"
  if [ "$cg_mem" = "max" ]; then
    kv "cgroup_memory_limit" "max (unlimited)"
  else
    kv "cgroup_memory_limit" "$(bytes_to_mb "$cg_mem") MB"
  fi
  kv "cgroup_cpu_max" "$(cat /sys/fs/cgroup/cpu.max 2>/dev/null)"
elif [ -r /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
  cg_mem="$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null)"
  cg_mb=$(bytes_to_mb "$cg_mem")
  if [ "$cg_mb" -gt 1048576 ]; then
    kv "cgroup_memory_limit" "effectively unlimited"
  else
    kv "cgroup_memory_limit" "${cg_mb} MB"
  fi
  kv "cgroup_cpu_quota_us" "$(cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us 2>/dev/null)"
  kv "cgroup_cpu_period_us" "$(cat /sys/fs/cgroup/cpu/cpu.cfs_period_us 2>/dev/null)"
else
  kv "cgroup_memory_limit" "not readable"
  CG_LIMIT_READABLE="no"
fi

kv "ulimit_open_files" "$(ulimit -n 2>/dev/null)"
kv "ulimit_max_processes" "$(ulimit -u 2>/dev/null)"
kv "ulimit_max_memory_kb" "$(ulimit -v 2>/dev/null)"
kv "ulimit_file_size" "$(ulimit -f 2>/dev/null)"

# ---------------------------------------------------------------------------
section "RUNTIME / TOOLING"
# ---------------------------------------------------------------------------

tool "node" node --version
tool "npm" npm --version
tool "pnpm" pnpm --version
tool "yarn" yarn --version
tool "corepack" corepack --version
tool "git" git --version
tool "python3" python3 --version
tool "php" php --version
tool "composer" composer --version
tool "make" make --version
tool "gcc" gcc --version

echo
if have node; then
  kv "node_path" "$(command -v node)"
  kv "node_arch" "$(soft node -e 'console.log(process.platform + "/" + process.arch)')"
fi
if have nvm || [ -d "$HOME/.nvm" ]; then
  kv "nvm_present" "yes ($HOME/.nvm)"
else
  kv "nvm_present" "no"
fi

# ---------------------------------------------------------------------------
section "CONTAINER RUNTIME"
# ---------------------------------------------------------------------------

if tool "docker" docker --version; then
  # `docker info` touches the daemon socket read-only; it starts nothing.
  if soft docker info >/dev/null 2>&1; then
    kv "docker_daemon_accessible" "yes (as $(id -un 2>/dev/null))"
    CAP_DOCKER="YES"
    kv "docker_server_version" "$(soft docker version --format '{{.Server.Version}}')"
    kv "docker_storage_driver" "$(docker info --format '{{.Driver}}' 2>/dev/null)"
    kv "docker_root_dir" "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)"
    kv "docker_containers_total" "$(docker info --format '{{.Containers}}' 2>/dev/null)"
    kv "docker_images_total" "$(docker info --format '{{.Images}}' 2>/dev/null)"
  else
    kv "docker_daemon_accessible" "NO (binary present, daemon unreachable or no permission)"
    CAP_DOCKER="NO"
  fi
else
  CAP_DOCKER="NO"
fi

if have docker && docker compose version >/dev/null 2>&1; then
  kv "docker_compose (plugin)" "$(soft docker compose version)"
elif have docker-compose; then
  kv "docker_compose (standalone)" "$(soft docker-compose --version)"
else
  kv "docker_compose" "not installed"
fi

kv "podman" "$(have podman && soft podman --version || echo 'not installed')"

# ---------------------------------------------------------------------------
section "PROCESS MANAGEMENT / SCHEDULING"
# ---------------------------------------------------------------------------

if have systemctl && [ -d /run/systemd/system ]; then
  kv "systemd" "available"
  kv "systemd_user_scope" "$(systemctl --user is-system-running 2>/dev/null || echo 'user scope unavailable')"
  kv "lingering_enabled" "$(loginctl show-user "$(id -un 2>/dev/null)" -p Linger --value 2>/dev/null || echo unknown)"
  SYSTEMD_OK=yes
else
  kv "systemd" "not available"
  SYSTEMD_OK=no
fi

tool "pm2" pm2 --version && PM2_OK=yes || PM2_OK=no
kv "screen" "$(have screen && echo available || echo 'not installed')"
kv "tmux" "$(have tmux && echo available || echo 'not installed')"
kv "supervisord" "$(have supervisord && echo available || echo 'not installed')"
kv "nohup" "$(have nohup && echo available || echo 'not installed')"

echo
if have crontab; then
  kv "crontab_binary" "available"
  # Count only. Job contents are never printed: unrelated sites' jobs are none
  # of this report's business.
  cron_count="$(crontab -l 2>/dev/null | grep -cvE '^\s*(#|$)')"
  if crontab -l >/dev/null 2>&1; then
    kv "user_crontab_entries" "${cron_count:-0} active line(s) [contents withheld]"
    CAP_CRON="YES"
  else
    kv "user_crontab_entries" "no crontab for this user (or not readable)"
    CAP_CRON="YES"
  fi
else
  kv "crontab_binary" "not installed"
  CAP_CRON="NO"
fi

for svc in cron crond; do
  if have systemctl && systemctl is-active "$svc" >/dev/null 2>&1; then
    kv "cron_service ($svc)" "active"
    CAP_CRON="YES"
  fi
done
[ -d /etc/cron.d ] && kv "/etc/cron.d" "present"

if [ "$SYSTEMD_OK" = "yes" ] || [ "$PM2_OK" = "yes" ]; then
  CAP_NODE_PERSIST="YES"
elif have screen || have tmux || have nohup; then
  CAP_NODE_PERSIST="UNKNOWN"
fi

# ---------------------------------------------------------------------------
section "DATABASE / CACHE"
# ---------------------------------------------------------------------------

tool "psql (client)" psql --version && PSQL_OK=yes || PSQL_OK=no
tool "postgres (server)" postgres --version && PGSERVER_OK=yes || PGSERVER_OK=no
tool "pg_dump" pg_dump --version
tool "mysql (client)" mysql --version
tool "mariadb (client)" mariadb --version
tool "mysqld" mysqld --version
tool "redis-server" redis-server --version
tool "redis-cli" redis-cli --version
tool "sqlite3" sqlite3 --version

echo
for svc in postgresql mysql mariadb redis redis-server; do
  if have systemctl && systemctl is-active "$svc" >/dev/null 2>&1; then
    kv "service_active ($svc)" "active"
  fi
done

# Local Postgres listening?
if command -v ss >/dev/null 2>&1; then
  pg_listen="$(ss -H -ltn 2>/dev/null | awk '{print $4}' | grep -c ':5432$')"
elif command -v netstat >/dev/null 2>&1; then
  pg_listen="$(netstat -ltn 2>/dev/null | awk '{print $4}' | grep -c ':5432$')"
else
  pg_listen="0"
fi
kv "postgres_listening_5432_local" "$([ "${pg_listen:-0}" -gt 0 ] && echo yes || echo 'no / not visible')"

if [ "$PGSERVER_OK" = "yes" ] || [ "${pg_listen:-0}" -gt 0 ]; then
  CAP_PG_LOCAL="YES"
elif [ "$CAP_DOCKER" = "YES" ]; then
  # Docker can run Postgres even when no server package is installed.
  CAP_PG_LOCAL="YES"
else
  CAP_PG_LOCAL="NO"
fi

# ---------------------------------------------------------------------------
section "WEB INFRASTRUCTURE"
# ---------------------------------------------------------------------------
# Structural facts only. Configuration files are NOT dumped: they routinely
# contain credentials, upstream hosts and certificate paths.

tool "nginx" nginx -v && NGINX_OK=yes || NGINX_OK=no
tool "apache2" apache2 -v && APACHE_OK=yes || APACHE_OK=no
tool "httpd" httpd -v
tool "openlitespeed" /usr/local/lsws/bin/lshttpd -v
tool "caddy" caddy version
tool "certbot" certbot --version
tool "openssl" openssl version

[ -d /usr/local/lsws ] && { kv "litespeed_dir" "/usr/local/lsws present"; LSWS_OK=yes; } || LSWS_OK=no

echo
for svc in nginx apache2 httpd lsws lshttpd caddy; do
  if have systemctl && systemctl is-active "$svc" >/dev/null 2>&1; then
    kv "web_service_active ($svc)" "active"
  fi
done

echo
echo "  listening TCP ports (address:port and process name only):"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | awk 'NR>1 {print $4, $6}' | sed 's/users:((\"/ /; s/\".*//' | sort -u | head -n 30 | sed 's/^/    /'
elif command -v netstat >/dev/null 2>&1; then
  netstat -ltnp 2>/dev/null | awk 'NR>2 {print $4, $7}' | sort -u | head -n 30 | sed 's/^/    /'
elif command -v lsof >/dev/null 2>&1; then
  lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $9, $1}' | sort -u | head -n 30 | sed 's/^/    /'
elif [ -r /proc/net/tcp ]; then
  # Last resort: decode the hex local_address column. Ports only, no process.
  echo "    (from /proc/net/tcp - ports only, no process names)"
  awk 'NR>1 && $4=="0A" {split($2,a,":"); print a[2]}' /proc/net/tcp 2>/dev/null |
    sort -u | while read -r hexport; do
      printf '    listening port %d\n' "$((16#$hexport))"
    done | head -n 30
else
  echo "    (no tool available to list listening sockets)"
fi

if [ "$NGINX_OK" = "yes" ] || [ "$APACHE_OK" = "yes" ] || [ "$LSWS_OK" = "yes" ] || have caddy; then
  CAP_PROXY="YES"
else
  CAP_PROXY="NO"
fi

# ---------------------------------------------------------------------------
section "NETWORKING"
# ---------------------------------------------------------------------------

kv "dns_resolution (cloudflare.com)" "$(getent hosts cloudflare.com >/dev/null 2>&1 && echo works || echo FAILED)"
kv "dns_resolution (github.com)" "$(getent hosts github.com >/dev/null 2>&1 && echo works || echo FAILED)"

if have curl; then
  kv "curl" "$(soft curl --version)"
  kv "https_to_github.com" "$(soft curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://github.com)"
  kv "https_to_registry.npmjs.org" "$(soft curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://registry.npmjs.org)"
  kv "https_to_ghcr.io" "$(soft curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://ghcr.io)"
  kv "public_egress_ip" "$(soft curl -s --max-time 8 https://api.ipify.org)"
else
  kv "curl" "not installed"
fi
kv "wget" "$(have wget && soft wget --version || echo 'not installed')"

echo
echo "  outbound TCP port probes (no credentials sent, no data written):"
echo "    NOTE: 'refused/unreachable' still proves egress on that port is not"
echo "          filtered; 'blocked (timeout)' suggests an outbound firewall."
printf '    %-28s %s\n' "1.1.1.1:443 (https)" "$(probe_tcp 1.1.1.1 443)"
printf '    %-28s %s\n' "1.1.1.1:5432 (postgres)" "$(probe_tcp 1.1.1.1 5432)"
printf '    %-28s %s\n' "1.1.1.1:6379 (redis)" "$(probe_tcp 1.1.1.1 6379)"
printf '    %-28s %s\n' "8.8.8.8:5432 (postgres)" "$(probe_tcp 8.8.8.8 5432)"

# bash's /dev/tcp cannot tell ECONNREFUSED from "the network dropped it", so a
# non-timeout failure is NOT proof that egress on 5432 works. Only a completed
# connection proves it; anything else needs a real database endpoint to confirm.
pg_egress="$(probe_tcp 1.1.1.1 5432)"
case "$pg_egress" in
  open) CAP_PG_EXTERNAL="YES" ;;
  blocked*) CAP_PG_EXTERNAL="NO (outbound 5432 appears filtered)" ;;
  *) CAP_PG_EXTERNAL="UNVERIFIED (probe inconclusive - test against a real host)" ;;
esac

echo
kv "ufw_binary" "$(have ufw && echo present || echo 'not installed')"
kv "iptables_binary" "$(have iptables && echo present || echo 'not installed')"
kv "firewalld_binary" "$(have firewall-cmd && echo present || echo 'not installed')"
# Status reads need root on most hosts; we never sudo, so this may be blank.
if have ufw; then
  kv "ufw_status (unprivileged)" "$(soft ufw status | head -n 1)"
fi

# ---------------------------------------------------------------------------
section "PORT BINDING CAPABILITY"
# ---------------------------------------------------------------------------
# Opens a listener on a high port for a fraction of a second, then closes it.
# Nothing is installed and nothing persists.

bind_test() {
  local addr="$1" port="$2"
  if have python3; then
    python3 - "$addr" "$port" <<'PYEOF' 2>/dev/null
import socket, sys
addr, port = sys.argv[1], int(sys.argv[2])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind((addr, port)); s.listen(1); print("OK")
except PermissionError:
    print("FAILED (permission denied - privileged port)")
except OSError as e:
    reason = "already in use" if e.errno in (98, 48) else (e.strerror or type(e).__name__)
    print(f"FAILED ({reason})")
finally:
    s.close()
PYEOF
  else
    echo "unknown (python3 unavailable)"
  fi
}

# High unprivileged ports only. Standard production service ports (80, 443,
# 3306, 5432, ...) are deliberately NOT probed: this script runs on a live host
# that may be serving real sites, and even a momentary bind there is a risk
# discovery has no need to take. Whether the app user can bind a listener is
# fully answered by the ports below.
kv "bind 127.0.0.1:39217" "$(bind_test 127.0.0.1 39217)"
kv "bind 0.0.0.0:39218 (public)" "$(bind_test 0.0.0.0 39218)"
kv "bind 0.0.0.0:3001 (app port)" "$(bind_test 0.0.0.0 3001)"

# ---------------------------------------------------------------------------
section "EXISTING GROWWITHMH / APPLICATION ENVIRONMENT"
# ---------------------------------------------------------------------------
# Directory NAMES and existence only. No file contents are read or printed.

echo "  candidate web roots:"
for d in "$HOME/public_html" "$HOME/domains" "/var/www" "/var/www/html" \
         "/usr/local/lsws/DEFAULT/html" "/home/*/public_html"; do
  for expanded in $d; do
    [ -d "$expanded" ] && printf '    %-46s %s\n' "$expanded" "exists"
  done
done

echo
echo "  Hostinger domain structure (names only, depth 1):"
if [ -d "$HOME/domains" ]; then
  find "$HOME/domains" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -n 15 | sed 's/^/    /'
else
  echo "    ~/domains not present (likely a VPS rather than shared hosting)"
fi

echo
echo "  GrowwithMH / OpenSEO deployment markers:"
FOUND_APP=0
for p in "$HOME/growwithmh-seo" "$HOME/growwithmh" "$HOME/open-seo" "$HOME/openseo" \
         "/opt/growwithmh-seo" "/opt/growwithmh" "/srv/growwithmh-seo" \
         "/var/www/growwithmh-seo"; do
  if [ -d "$p" ]; then
    printf '    %-46s %s\n' "$p" "EXISTS"
    FOUND_APP=1
    [ -f "$p/package.json" ] && printf '    %-46s %s\n' "  $p/package.json" "present"
    [ -d "$p/node_modules" ] && printf '    %-46s %s\n' "  $p/node_modules" "present"
    [ -d "$p/dist" ] && printf '    %-46s %s\n' "  $p/dist" "present"
    [ -d "$p/.wrangler" ] && printf '    %-46s %s\n' "  $p/.wrangler (local D1 state)" "present"
    # Existence only — never the contents.
    [ -f "$p/.env" ] && printf '    %-46s %s\n' "  $p/.env" "present (contents NOT read)"
  fi
done
[ "$FOUND_APP" = "0" ] && echo "    no GrowwithMH/OpenSEO directory found in the usual locations"

echo
echo "  broader search for the app (names only, may be slow):"
find "$HOME" -maxdepth 3 -type d \( -iname '*growwithmh*' -o -iname '*open-seo*' -o -iname '*openseo*' \) 2>/dev/null | head -n 10 | sed 's/^/    /'

echo
echo "  docker artefacts named for this app:"
if [ "$CAP_DOCKER" = "YES" ]; then
  docker ps -a --format '    container: {{.Names}} | image: {{.Image}} | {{.Status}}' 2>/dev/null | grep -iE 'seo|growwithmh|postgres|redis' | head -n 10
  docker images --format '    image: {{.Repository}}:{{.Tag}} ({{.Size}})' 2>/dev/null | grep -iE 'seo|growwithmh|postgres|redis' | head -n 10
  docker volume ls --format '    volume: {{.Name}}' 2>/dev/null | grep -iE 'seo|growwithmh|postgres' | head -n 10
else
  echo "    (docker not accessible)"
fi

echo
echo "  runtime data directories:"
for p in /var/lib/postgresql /var/lib/mysql /var/lib/redis /var/lib/docker; do
  [ -d "$p" ] && printf '    %-46s %s\n' "$p" "exists"
done

echo
echo "  relevant environment variables (EXISTENCE ONLY - values never shown):"
for v in NODE_ENV PORT DATABASE_URL DATABASE_PROVIDER DATAFORSEO_API_KEY \
         AUTH_MODE DEPLOYMENT_MODE MCP_AUTH_TOKEN BETTER_AUTH_SECRET \
         BETTER_AUTH_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
         OPENROUTER_API_KEY ALLOWED_HOST PGHOST PGPORT PGUSER PGPASSWORD; do
  envcheck "$v"
done

# ---------------------------------------------------------------------------
section "CAPABILITY SUMMARY"
# ---------------------------------------------------------------------------

# The self-host container runs a Vite SSR build at start under a 4 GB V8 heap
# ceiling (.npmrc node-options). Build-time memory, not steady state, is what
# decides suitability — this is where a 2 GB box fails.
EFFECTIVE_MB=$(( RAM_TOTAL_MB + SWAP_TOTAL_MB ))

# /proc/meminfo on shared hosting reports the WHOLE physical machine, not this
# account's allowance. Reading 502 GB off a box shared by hundreds of tenants
# and calling it "GOOD" is exactly the wrong answer, so when the account's real
# cap cannot be read the verdict is UNKNOWN — never GOOD.
SHARED_HOSTING="no"
if [ "$(id -u 2>/dev/null)" != "0" ] && [ "$CG_LIMIT_READABLE" = "no" ]; then
  SHARED_HOSTING="likely"
fi
case "$(hostname 2>/dev/null)" in
  *main-hosting*|*hostinger*|*web[0-9]*) SHARED_HOSTING="likely" ;;
esac

if [ "$RAM_TOTAL_MB" -le 0 ]; then
  CAP_RAM="UNKNOWN"
elif [ "$SHARED_HOSTING" = "likely" ]; then
  CAP_RAM="UNKNOWN (host-wide RAM only; per-account limit not readable)"
elif [ "$RAM_TOTAL_MB" -ge 4000 ]; then
  CAP_RAM="GOOD"
elif [ "$EFFECTIVE_MB" -ge 4000 ] || [ "$RAM_TOTAL_MB" -ge 2000 ]; then
  CAP_RAM="MARGINAL"
else
  CAP_RAM="POOR"
fi

printf '  %-46s %s\n' "Docker viable:" "$CAP_DOCKER"
printf '  %-46s %s\n' "Persistent Node viable:" "$CAP_NODE_PERSIST"
printf '  %-46s %s\n' "Local PostgreSQL viable:" "$CAP_PG_LOCAL"
printf '  %-46s %s\n' "External PostgreSQL viable:" "$CAP_PG_EXTERNAL"
printf '  %-46s %s\n' "Native cron viable:" "$CAP_CRON"
printf '  %-46s %s\n' "Reverse proxy viable:" "$CAP_PROXY"
printf '  %-46s %s\n' "RAM suitability for current runtime:" "$CAP_RAM"
echo
printf '  %-46s %s\n' "(detected RAM / swap)" "${RAM_TOTAL_MB} MB / ${SWAP_TOTAL_MB} MB"
echo
echo "  Scoring notes:"
echo "    RAM       On shared hosting /proc/meminfo shows the whole physical box,"
echo "              so the verdict is UNKNOWN unless the per-account cgroup cap"
echo "              is readable. Otherwise GOOD >= 4000 MB, MARGINAL >= 2000 MB"
echo "              (or with swap), POOR below. The boot-time Vite SSR build is"
echo "              the peak, not steady-state serving."
echo "    ExternalPG only a COMPLETED connection counts as proof. A refused or"
echo "              unreachable probe is inconclusive - bash cannot distinguish"
echo "              'nothing listening' from 'filtered', so verify against a real"
echo "              database host before relying on it."
echo "    LocalPG   YES when a server is installed, listening, or Docker can run one."

echo
echo "===== GROWWITHMH HOSTINGER DISCOVERY END ====="
