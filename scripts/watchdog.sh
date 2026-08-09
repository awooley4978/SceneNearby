#!/usr/bin/env bash
# watchdog.sh — polls Metro dev server and restarts Expo if it's down
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/scripts/watchdog.log"
URL="http://localhost:8081/"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

while true; do
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 "$URL" 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    sleep 30
  else
    log "Metro not responding (HTTP $HTTP_CODE) — restarting Expo..."
    pkill -f "expo start" 2>/dev/null || true
    sleep 2
    cd "$PROJECT_DIR" && nohup ./node_modules/.bin/expo start --tunnel > /tmp/expo-start.log 2>&1 &
    log "Expo restarted. PID: $!"
    sleep 10
  fi
done
