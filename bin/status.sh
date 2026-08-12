#!/usr/bin/env bash
# status.sh — rebuild the status page and open it. This is what the desktop icon
# runs, and it is the only thing that ever builds the page. No timer, no watcher:
# the page is current because it was made half a second ago.
#
# A build failure opens a page saying so rather than opening nothing. A status
# page that silently shows yesterday's render is the exact failure it exists to
# prevent, and notify-send is not a reliable second channel.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
OUT="$ROOT/status.html"

if ! ERR="$(python3 "$ROOT/bin/status.py" 2>&1 >/dev/null)"; then
  {
    printf '<!doctype html><meta charset="utf-8"><title>Raptor3000 — status build failed</title>'
    printf '<body style="background:#12161c;color:#dfe5ec;font:16px/1.6 system-ui;padding:3rem">'
    printf '<h1 style="color:#d98a8a">The status page could not be built</h1>'
    printf '<p>Nothing below is current. <code>bin/status.py</code> exited nonzero at %s.</p>' "$(date '+%Y-%m-%d %H:%M')"
    printf '<pre style="background:#1a2029;padding:1rem;border-radius:8px;overflow:auto">%s</pre>' \
           "$(printf '%s' "$ERR" | sed 's/&/\&amp;/g; s/</\&lt;/g')"
  } > "$OUT"
fi

xdg-open "$OUT" >/dev/null 2>&1 &
