#!/usr/bin/env bash
# Hardened runner: one instance at a time, failure reported not fatal, always exit 0
# so the timer never spams. Usage: run-job.sh <name> <command...>
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JOB="${1:?usage: run-job.sh <job-name> <command...>}"; shift
mkdir -p "$ROOT/queue"
LOCK="$ROOT/queue/.lock.$JOB"; LOG="$ROOT/queue/job.$JOB.log"

exec 9>"$LOCK" 2>/dev/null || true
if command -v flock >/dev/null 2>&1 && ! flock -n 9; then
  echo "$(date -Is) [$JOB] previous run still active — skipping" >> "$LOG"; exit 0
fi

echo "== $(date -Is) [$JOB] start ==" >> "$LOG"
out="$("$@" 2>&1)"; code=$?
printf '%s\n' "$out" >> "$LOG"
echo "== $(date -Is) [$JOB] exit $code ==" >> "$LOG"
# Keep the log from growing forever; nobody prunes these by hand.
tail -n 2000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
exit 0
