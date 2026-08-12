#!/usr/bin/env bash
# install-uri-handler.sh — register raptor:// with the desktop, so the two
# buttons on status.html can reach bin/uri-handler.sh.
#
# User-level; no root. The generated .desktop is glue and lives with the other
# generated launchers; the logic it points at lives in this repo, where it has
# history. Re-runnable.
#
#   bin/install-uri-handler.sh            install
#   bin/install-uri-handler.sh --remove   undo
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS="$HOME/.local/share/applications"
ENTRY="$APPS/raptor-uri.desktop"

if [ "${1:-}" = "--remove" ]; then
  rm -f "$ENTRY"
  update-desktop-database "$APPS" 2>/dev/null || true
  echo "removed $ENTRY"
  exit 0
fi

mkdir -p "$APPS"
cat > "$ENTRY" <<ENTRYEOF
[Desktop Entry]
Type=Application
Name=Raptor3000 link handler
Comment=Handles raptor:// links from the status page
Exec=$ROOT/bin/uri-handler.sh %u
NoDisplay=true
Terminal=false
MimeType=x-scheme-handler/raptor;
ENTRYEOF

update-desktop-database "$APPS" 2>/dev/null || true
xdg-mime default raptor-uri.desktop x-scheme-handler/raptor

echo "registered raptor:// → $ROOT/bin/uri-handler.sh"
echo "test with: xdg-open 'raptor://ping'"
