#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [ -z "${STABLE_TUNNEL_URL:-}" ]; then
  echo "Missing STABLE_TUNNEL_URL in revora-frontend/.env.local"
  echo ""
  echo "Example:"
  echo "  ngrok http 3000 --url=reissue-irritable-slider.ngrok-free.dev"
  echo "  STABLE_TUNNEL_URL=https://reissue-irritable-slider.ngrok-free.dev"
  echo "  STABLE_TUNNEL_PORT=3000"
  echo ""
  echo "Then run: bun run dev:stable"
  exit 1
fi

TUNNEL_HOST="${STABLE_TUNNEL_URL%/}"
TUNNEL_PORT="${STABLE_TUNNEL_PORT:-3000}"
CLI_TUNNEL_URL="${TUNNEL_HOST}:${TUNNEL_PORT}"

echo "Public app URL:  ${TUNNEL_HOST}"
echo "CLI tunnel URL:  ${CLI_TUNNEL_URL}"
echo ""
echo "Make sure ngrok is running, e.g.:"
echo "  ngrok http ${TUNNEL_PORT} --url=reissue-irritable-slider.ngrok-free.dev"
echo ""

exec shopify app dev --tunnel-url="${CLI_TUNNEL_URL}"
