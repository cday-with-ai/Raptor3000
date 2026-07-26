#!/usr/bin/env bash
# raptor-run.sh — one nightly increment of dev work.
#
# The first job here that writes code on a schedule rather than producing a page,
# and it is modelled on wisp's nightly review because that pattern already
# survived contact: gate on the suite, land on green, and anything beyond the bar
# becomes prose rather than a staged branch that rots.
#
# What authorises the work is THIS SCRIPT RUNNING, not PLAN.md. The plan says
# where the work got to; the timer decides whether anything happens. Delete the
# unit and the work stops dead while the plan sits there doing nothing. If that
# ever stops being true, the plan has become a dispatcher and this has failed.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

say() { printf '%s raptor: %s\n' "$(date +%H:%M:%S)" "$*"; }

# Count the suite before anything touches it — this is the ratchet.
count_tests() { (cd packages/shared && timeout 300 npx vitest run 2>&1 | grep -oE 'Tests +[0-9]+ passed' | grep -oE '[0-9]+' | head -1); }
count_skips() { grep -rho "\.skip\|\.todo" packages/*/src --include="*.test.ts" 2>/dev/null | wc -l; }

# Refuse to run on a dirty tree. This is the interlock that matters here and in
# no other project: Carson works in this repo himself, and a nightly job that
# does `git add -A` would sweep his uncommitted work-in-progress into a commit
# authored by "Raptor3000" — silently, at 02:30, mixed in with its own changes.
# Nothing else on this machine shares a working tree with a human.
if ! git diff --quiet || ! git diff --cached --quiet; then
  say "working tree is dirty — Carson has work in progress. Standing down."
  say "  $(git status --porcelain | wc -l) file(s) uncommitted"
  exit 0
fi

before=$(count_tests); skips_before=$(count_skips)
[ -n "$before" ] || { say "suite would not run before starting — refusing to work on a red tree"; exit 1; }
say "suite at $before tests, $skips_before skipped"
HEAD_BEFORE=$(git rev-parse HEAD)

if [ "${RAPTOR_SKIP_JOB:-}" != "1" ]; then
  bin/raptor-job.sh dev || say "job failed (exit $?)"
fi

after=$(count_tests); skips_after=$(count_skips)

# The ratchet. Never weaker: adding tests is the point, deleting or skipping them
# is how a suite stops meaning anything, and a job that can silence its own gate
# has no gate. Anything that trips this is reverted wholesale rather than argued
# with — the model does not get to explain why fewer tests is fine.
if [ -z "$after" ]; then
  say "suite does not run after the increment — reverting to $HEAD_BEFORE"
  git reset --hard "$HEAD_BEFORE" >/dev/null 2>&1
elif [ "$after" -lt "$before" ] || [ "$skips_after" -gt "$skips_before" ]; then
  say "RATCHET: tests $before→$after, skips $skips_before→$skips_after — reverting"
  git reset --hard "$HEAD_BEFORE" >/dev/null 2>&1
else
  git add -A
  if ! git diff --cached --quiet; then
    git -c user.name=Raptor3000 -c user.email=raptor@localhost \
        commit -qm "nightly: $(date +%Y-%m-%d) — $before→$after tests" || true
    say "landed $(git rev-parse --short HEAD) · $before→$after tests"
  else
    say "no change — a quiet night is a result"
  fi
fi
