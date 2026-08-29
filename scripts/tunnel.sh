#!/usr/bin/env bash
set -euo pipefail
docker rm -f surveyall-tunnel 2>/dev/null || true
docker run -d --name surveyall-tunnel --network host cloudflare/cloudflared:latest \
  tunnel --no-autoupdate --url http://localhost:3000

for i in $(seq 1 30); do
  URL=$(docker logs surveyall-tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1)
  if [ -n "$URL" ]; then
    echo "$URL"
    exit 0
  fi
  sleep 2
done

echo "No tunnel URL found after 60s. Log tail:" >&2
docker logs surveyall-tunnel 2>&1 | tail -20 >&2
exit 1
