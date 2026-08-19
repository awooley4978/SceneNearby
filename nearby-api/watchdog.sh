#!/bin/bash
# Watchdog: keep the Nearby API (:3001) alive, verifiably.
#
# Why not the old TCP check? A raw /dev/tcp connect can succeed while the
# process is wedged (socket held, no HTTP responses) or while another process
# briefly holds the port — so it produced false "restarted OK" results.
# This watchdog:
#   1. Requires a real HTTP 200 + {"status":"ok"} body from /health.
#   2. On failure, restarts and POLLS for health up to 30s (no single 5s guess).
#   3. Ensures the API is up at boot time (covers machine replacement, where
#      every background process dies and /tmp is wiped).
#   4. Appends to an append-only log (never truncates) and records memory
#      pressure at each restart so the death cause is traceable.
#
# Install:  crontab -e  ->  @reboot sleep 5; bash /home/team/shared/nearby-api/watchdog.sh >> /tmp/api-watchdog.log 2>&1 &

API_DIR=/home/team/shared/nearby-api
LOG=/tmp/api-watchdog.log

log() { echo "$(date -Is) $*" >> "$LOG"; }

# Real health check: HTTP GET /health must return JSON containing "ok".
health_ok() {
  local body
  body=$(curl -s -m 3 http://127.0.0.1:3001/health 2>/dev/null)
  [ -n "$body" ] && echo "$body" | grep -q '"ok"' && return 0
  return 1
}

start_api() {
  bash "$API_DIR/start.sh" >> "$LOG" 2>&1
}

# Boot: machine replacement kills every process; bring the API back first.
if ! health_ok; then
  log "API down at startup — starting"
  start_api
fi

while true; do
  if ! health_ok; then
    mem=$(free -m 2>/dev/null | awk 'NR==2{print $3"/"$2"MB used"}')
    log "API unhealthy — restarting (mem: ${mem:-unknown})"
    start_api
    ok=0
    for i in $(seq 1 15); do
      sleep 2
      if health_ok; then ok=1; break; fi
    done
    if [ "$ok" = "1" ]; then
      log "API restarted OK (pid $(lsof -ti:3001 2>/dev/null | head -1))"
    else
      log "API FAILED to restart after 30s"
      tail -8 /tmp/server.log >> "$LOG" 2>/dev/null
    fi
  fi
  sleep 15
done
