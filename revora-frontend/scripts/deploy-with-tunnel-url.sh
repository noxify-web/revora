#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

APP_URL="${SHOPIFY_APP_URL:-${HOST:-}}"
if [ -z "${APP_URL}" ]; then
  echo "Missing SHOPIFY_APP_URL or HOST in revora-frontend/.env.local"
  exit 1
fi

APP_URL="${APP_URL%/}"
TOML="shopify.app.toml"
BACKUP="$(mktemp)"

cp "${TOML}" "${BACKUP}"
trap 'cp "${BACKUP}" "${TOML}"; rm -f "${BACKUP}"' EXIT

sed -i \
  -e "s|^application_url = .*|application_url = \"${APP_URL}\"|" \
  -e "s|https://revora-app.example.com|${APP_URL}|g" \
  "${TOML}"

echo "Deploying app config with application_url=${APP_URL}"
SHOPIFY_CLI_AGENT_INFO="n:grok|v:1|p:cursor" \
  shopify app deploy --allow-updates --message "${1:-Fix storefront reviews bootstrap and app proxy URL}"