#!/usr/bin/env bash
# start-expo.sh — starts Expo dev server with watchdog monitoring
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Scene Nearby Expo environment..." | tee "$PROJECT_DIR/scripts/watchdog.log"

# Start Expo in background
cd "$PROJECT_DIR" && nohup npx expo start --tunnel > /tmp/expo-start.log 2>&1 &
EXPO_PID=$!
echo "Expo started (PID: $EXPO_PID). Log: /tmp/expo-start.log"

# Wait for Expo to be ready
echo "Waiting for Metro to be ready..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null --connect-timeout 2 http://localhost:8081/ 2>/dev/null; then
    echo "Metro is ready!"
    break
  fi
  sleep 2
done

# Start watchdog in background
cd "$PROJECT_DIR" && nohup bash scripts/watchdog.sh >> "$PROJECT_DIR/scripts/watchdog.log" 2>&1 &
WATCHDOG_PID=$!
echo "Watchdog started (PID: $WATCHDOG_PID)"

echo "Expo + Watchdog running. Use 'pkill -f watchdog' and 'pkill -f expo' to stop."
wait $EXPO_PID
