#!/usr/bin/env bash
# usage-digest — yesterday's HUMAN usage of raptor3000.pages.dev, as one
# line in the pager daily digest.
#
# Deterministic plumbing end to end: Cloudflare Web Analytics GraphQL in,
# one `beeper send` out, no model anywhere. "Human" is enforced at the
# beacon (index.html gates on navigator.webdriver and raptor.noCount), so
# by the time a number reaches this script the filtering already happened.
# A zero-traffic day sends nothing — an empty digest day is correct
# (pager house rule), and counting started 2026-08-14 so early days are
# legitimately quiet.
set -euo pipefail

ACCT="ab98801338b2b2fb50627d026f693dda"
TOK="$(grep '^CLOUDFLARE_ANALYTICS_TOKEN=' "$HOME/.secrets" | cut -d= -f2)"
[ -n "$TOK" ] || { echo "no CLOUDFLARE_ANALYTICS_TOKEN in ~/.secrets" >&2; exit 2; }

DAY="${1:-$(date -d yesterday +%F)}"

QUERY=$(printf '{"query":"query { viewer { accounts(filter: {accountTag: \\"%s\\"}) { rumPageloadEventsAdaptiveGroups(limit: 1, filter: {date: \\"%s\\"}) { count sum { visits } } } } }"}' "$ACCT" "$DAY")

RESP="$(curl -sf --max-time 30 \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  https://api.cloudflare.com/client/v4/graphql -d "$QUERY")"

read -r VIEWS VISITS <<EOF
$(printf '%s' "$RESP" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if d.get("errors"):
    print(d["errors"][0]["message"], file=sys.stderr)
    raise SystemExit(1)
g = d["data"]["viewer"]["accounts"][0]["rumPageloadEventsAdaptiveGroups"]
views = g[0]["count"] if g else 0
visits = g[0]["sum"]["visits"] if g else 0
print(views, visits)')
EOF

if [ "${VISITS:-0}" -gt 0 ] || [ "${VIEWS:-0}" -gt 0 ]; then
  beeper send --source raptor3000 \
    "usage $DAY: $VISITS visits, $VIEWS page views (humans only; e2e and driven browsers don't count)"
else
  echo "quiet day ($DAY): nothing sent"
fi
