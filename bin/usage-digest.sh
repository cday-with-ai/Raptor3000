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

# Preflight: can this token see the account at all?
#
# This exists because the obvious check is impossible. Ask the digest
# query WITH an accountTag filter and an unauthorized token gets back
# `{"accounts":[{"rumPageloadEventsAdaptiveGroups":[]}]}` and
# `"errors": null` — an empty dataset, indistinguishable from a day
# nobody visited. Ask WITHOUT the filter and the same token is told
# "not authorized for that account". So the only way to know whether a
# zero is real is to ask a question the filter cannot paper over.
PROBE="$(curl -s --max-time 30 \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  https://api.cloudflare.com/client/v4/graphql \
  -d '{"query":"query { viewer { accounts { accountTag } } }"}' || true)"

BLIND="$(printf '%s' "$PROBE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    print("the analytics API returned something that is not JSON"); raise SystemExit(0)
errs = d.get("errors")
if errs:
    print(str(errs[0].get("message", "unknown GraphQL error"))); raise SystemExit(0)
accts = ((d.get("data") or {}).get("viewer") or {}).get("accounts") or []
if not any(a.get("accountTag") == "'"$ACCT"'" for a in accts):
    print("the token cannot see account '"$ACCT"'"); raise SystemExit(0)
print("")
')"

if [ -n "$BLIND" ]; then
  # Loud, and deliberately the opposite of the quiet-day rule: this is
  # the digest reporting that it is blind, which is never silent.
  beeper send --source raptor3000 \
    "usage digest is BLIND: $BLIND. Mint a token with Account | Account Analytics | Read on $ACCT as admin@chessascent.app, then replace CLOUDFLARE_ANALYTICS_TOKEN in ~/.secrets." || true
  echo "usage-digest: $BLIND" >&2
  exit 3
fi

QUERY=$(printf '{"query":"query { viewer { accounts(filter: {accountTag: \\"%s\\"}) { rumPageloadEventsAdaptiveGroups(limit: 1, filter: {date: \\"%s\\"}) { count sum { visits } } } } }"}' "$ACCT" "$DAY")

RESP="$(curl -s --max-time 30 \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  https://api.cloudflare.com/client/v4/graphql -d "$QUERY" || true)"

# Why this is not a one-liner into `read`: it used to be, and the check
# below ran INSIDE a command substitution feeding `read`, so its exit
# code was swallowed and every failure fell through to the quiet-day
# branch. From 2026-08-14 to 2026-08-15 the token was active but not
# authorized for the account, GraphQL answered with an empty result set
# rather than an HTTP error, and this script cheerfully reported a quiet
# day every single night. A digest that cannot tell "nobody came" from
# "I cannot see" is worse than no digest, because it is reassuring.
PARSED="$(printf '%s' "$RESP" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    print("ERR the analytics API returned something that is not JSON")
    raise SystemExit(0)
errs = d.get("errors")
if errs:
    print("ERR " + str(errs[0].get("message", "unknown GraphQL error")))
    raise SystemExit(0)
accts = ((d.get("data") or {}).get("viewer") or {}).get("accounts")
if accts is None:
    print("ERR the token cannot see this account at all")
    raise SystemExit(0)
if not accts:
    # An account filter the token is not authorized for comes back as an
    # empty LIST, with no error anywhere. This is the shape the silent
    # failure took, so it gets its own message rather than reading as 0.
    print("ERR the token is not authorized for this account")
    raise SystemExit(0)
g = accts[0].get("rumPageloadEventsAdaptiveGroups")
if g is None:
    print("ERR the analytics dataset was not returned")
    raise SystemExit(0)
views = g[0]["count"] if g else 0
visits = g[0]["sum"]["visits"] if g else 0
print("OK %d %d" % (views, visits))
')"

case "$PARSED" in
  ERR*)
    MSG="${PARSED#ERR }"
    # Loud, not silent — the opposite of the quiet-day rule, and
    # deliberately so: this is the digest reporting that it is blind.
    beeper send --source raptor3000 \
      "usage digest is BLIND: $MSG. Mint a token with Account | Account Analytics | Read on ab98801338b2b2fb50627d026f693dda as admin@chessascent.app, then replace CLOUDFLARE_ANALYTICS_TOKEN in ~/.secrets." || true
    echo "usage-digest: $MSG" >&2
    exit 3
    ;;
esac

VIEWS="$(printf '%s' "$PARSED" | awk '{print $2}')"
VISITS="$(printf '%s' "$PARSED" | awk '{print $3}')"

if [ "${VISITS:-0}" -gt 0 ] || [ "${VIEWS:-0}" -gt 0 ]; then
  beeper send --source raptor3000 \
    "usage $DAY: $VISITS visits, $VIEWS page views (humans only; e2e and driven browsers don't count)"
else
  echo "quiet day ($DAY): nothing sent"
fi
