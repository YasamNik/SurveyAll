#!/usr/bin/env bash
set -euo pipefail
docker rm -f surveyall-tunnel 2>/dev/null || true
docker run -d --name surveyall-tunnel --network host cloudflare/cloudflared:latest \
  tunnel --no-autoupdate --url http://localhost:3000
sleep 5
docker logs surveyall-tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1
