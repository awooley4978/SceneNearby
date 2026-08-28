#!/bin/bash
# Start the Nearby API sandbox server (:3001).
# Secrets come from .env (gitignored) or the ambient environment — never hardcoded here.
# Kill existing servers
for pid in $(lsof -ti:3001 2>/dev/null); do kill -9 $pid 2>/dev/null; done
sleep 1
# Load local secrets if present (kept out of version control).
if [ -f "$(dirname "$0")/.env" ]; then
  set -a; . "$(dirname "$0")/.env"; set +a
fi
# Export R2 credentials (from .env or the process environment; required for uploads).
export R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-${R2_Account_ID:-}}"
export R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-}"
export R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-}"
export R2_BUCKET_NAME="${R2_BUCKET_NAME:-scene-nearby-images}"
export PORT=3001
cd /home/team/shared/nearby-api
echo "=== start.sh $(date -Is) ===" >> /tmp/server.log
nohup env DISABLE_RESEARCH_WORKER=1 bun run src/server.ts >> /tmp/server.log 2>&1 &
echo "Server PID: $!"
