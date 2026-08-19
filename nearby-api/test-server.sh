#!/bin/bash
cd /home/team/shared/nearby-api
echo "=== Starting server ==="
bun run src/server.ts &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 3
echo "=== Server log ==="
echo "=== Health check ==="
curl -s http://localhost:8080/health
echo ""
echo "=== Submissions ==="
curl -s http://localhost:8080/api/submissions
echo ""
echo "=== Stats ==="
curl -s http://localhost:8080/api/stats
echo ""
echo "=== DONE ==="