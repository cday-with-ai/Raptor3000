#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ "${1:-}" = "--remove" ]; then
  sudo systemctl disable --now raptor.timer 2>/dev/null || true
  sudo rm -f /etc/systemd/system/raptor.{service,timer}; sudo systemctl daemon-reload
  echo "removed — the repo and its plan are untouched"; exit 0
fi
sudo cp "$ROOT/systemd/raptor.service" "$ROOT/systemd/raptor.timer" /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now raptor.timer
systemctl list-timers raptor.timer --all --no-pager
