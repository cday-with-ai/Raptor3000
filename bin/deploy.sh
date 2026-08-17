#!/usr/bin/env bash
# Build and deploy raptor3000 to Cloudflare Pages.
#
#   ./bin/deploy.sh          from the repo root
#   yarn deploy              same thing
#
# Written 2026-08-13 after the bare `wrangler` in the workspace script
# turned out to be a trap: wrangler is not a package dependency, so
# `yarn workspace @raptor3000/web deploy` died with "command not found"
# unless npx happened to be involved. This script uses npx explicitly,
# checks the things that actually fail, and says what went wrong.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f package.json ] || ! grep -q '"raptor3000"' package.json 2>/dev/null; then
  echo "error: run me from the raptor3000 repo (I cd to my parent, which should be it)" >&2
  exit 1
fi

echo "── auth ──────────────────────────────────────────"
# whoami exits 0 even when unauthenticated ("You are not
# authenticated." is a message, not a failure) — the gate has to read
# the output, not the exit code (Carson, 2026-08-16: the fake gate
# sailed past dead tokens and the deploy failed mid-way instead).
# Credentials come from CLOUDFLARE_API_TOKEN — set in .env, which
# wrangler loads itself (see docs "System environment variables").
if ! out=$(npx wrangler whoami 2>&1); then
  echo "error: wrangler failed to run. Output:" >&2
  echo "$out" >&2
  exit 1
fi
if echo "$out" | grep -qi "not authenticated"; then
  echo "error: not authenticated. Put a real CLOUDFLARE_API_TOKEN in .env" >&2
  echo "       (dashboard -> My Profile -> API Tokens -> Create Token)." >&2
  exit 1
fi
echo "wrangler: authenticated"

echo "── build ─────────────────────────────────────────"
yarn workspace @raptor3000/web build

echo "── deploy ────────────────────────────────────────"
npx --prefix packages/web wrangler pages deploy packages/web/dist \
  --project-name raptor3000 --branch master

echo "── verify ────────────────────────────────────────"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://raptor3000.pages.dev/ || echo 000)
if [ "$code" = "200" ]; then
  echo "live: https://raptor3000.pages.dev (200)"
else
  echo "warning: production answered $code — a fresh deploy can take a minute to propagate" >&2
fi
