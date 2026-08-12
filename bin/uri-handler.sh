#!/usr/bin/env bash
# uri-handler.sh — the two buttons on status.html, arriving as raptor:// links.
#
# Registered as a user-level scheme handler by bin/install-uri-handler.sh. The
# browser hands the whole URI in as $1.
#
# This is a fixed case statement over two literal strings and it stays that way.
# The moment it takes an argument out of the URI and does something with it, a
# web page is choosing what runs on this machine — which is a dispatcher wearing
# a link, and the wrong end of it is reachable by anything that can open a URL.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

case "${1:-}" in
  raptor://start*)
    exec "$ROOT/run.sh"
    ;;
  raptor://room*)
    exec "$HOME/.local/share/nmv-launchers/raptor3000-room.sh"
    ;;
  raptor://ping*)
    # Exists so the registration can be tested without starting anything.
    printf '%s ping ok\n' "$(date -Is)" >> "$ROOT/queue/uri.log"
    notify-send "Raptor3000" "URI handler is registered and working" 2>/dev/null || true
    ;;
  *)
    notify-send "Raptor3000" "unknown link: ${1:-<empty>}" 2>/dev/null || true
    echo "uri-handler: unknown link: ${1:-<empty>}" >&2
    exit 2
    ;;
esac
