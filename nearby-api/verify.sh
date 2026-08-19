#!/bin/bash
sudo chown -R agent-web-developer:team /home/team/shared/nearby-api 2>/dev/null
cd /home/team/shared/nearby-api
kill $(lsof -t -i:8080) 2>/dev/null
PORT=8080 bun run src/server.ts > /tmp/api-v2.log 2>&1 &
sleep 2
echo "=== LOG ==="
cat /tmp/api-v2.log
echo "=== HEALTH ==="
curl -s http://localhost:8080/health
echo ""
echo "=== TEMPLATES ==="
ls -la src/email-templates/
echo "=== DONE ==="