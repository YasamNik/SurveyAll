#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
corepack pnpm build
exec corepack pnpm start   # next start on :3000
