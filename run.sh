#!/usr/bin/env bash
# run.sh — start the dev server and open the client.
#
# Vite picks its own port when 5173 is taken, so the port is read out of vite's
# own startup line rather than assumed. Guessing it and opening a dead tab is the
# obvious failure and it looks identical to the app being broken.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

LOG="$ROOT/dev-server.log"
PIDF="$ROOT/.dev.pid"

if [ "${1:-}" = "--stop" ]; then
  [ -f "$PIDF" ] && kill "$(cat "$PIDF")" 2>/dev/null && echo "stopped"
  rm -f "$PIDF"; exit 0
fi

if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
  echo "already running (pid $(cat "$PIDF"))"
else
  command -v yarn >/dev/null || { notify-send "Raptor3000" "yarn not on PATH" 2>/dev/null; echo "yarn not found" >&2; exit 3; }
  : > "$LOG"
  nohup yarn dev >> "$LOG" 2>&1 &
  echo $! > "$PIDF"
fi

# Wait for vite to announce a URL — up to 40s, since a cold start builds deps.
URL=""
for _ in $(seq 1 80); do
  URL=$(grep -oE 'http://localhost:[0-9]+' "$LOG" 2>/dev/null | head -1)
  [ -n "$URL" ] && break
  sleep 0.5
done

if [ -z "$URL" ]; then
  notify-send "Raptor3000" "dev server did not start — see dev-server.log" 2>/dev/null
  echo "no URL in $LOG after 40s" >&2
  exit 1
fi

echo "$URL"
xdg-open "$URL" >/dev/null 2>&1 &
