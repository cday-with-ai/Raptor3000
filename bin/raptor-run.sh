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

# ---------------------------------------------------------------------------
# Whose change is it?
#
# Carson edits this repo by hand and a timer also writes code in it at 02:30.
# The first version of this guard refused to run AT ALL if `git status` was
# dirty, because the landing step was `git add -A` and would otherwise sweep his
# work-in-progress into a commit authored by "Raptor3000".
#
# That guard was correct about the danger and wrong about the remedy: it made
# HIS editing stop THE JOB. Over its first nineteen scheduled nights it stood
# down on thirteen — five on its own runner's lock file, four on a note he had
# written asking this very job for fixes. A nightly that any stray file can
# switch off is not a nightly, and "leave the tree clean or I don't run" is a
# demand no tool gets to make of the person who owns the repo.
#
# So the question moved from "is anything dirty" to "is it mine". Snapshot every
# dirty path and its content hash before the increment, snapshot again after:
#
#   new path, or hash moved   -> MINE     the job did it; the job commits it
#   dirty before, hash same   -> HIS      untouched, left exactly as found
#   dirty before, hash moved  -> COLLIDE  the job edited a file he had open;
#                                         neither committed nor reverted, only
#                                         reported. Ambiguity is not resolved
#                                         silently in favour of the machine.
#
# `--no-renames` keeps `porcelain -z` to one record per path; a rename record
# emits two NUL-separated fields and would misparse into a bogus path.
#
# queue/ is excluded from the baseline on purpose. It is this job's inbox, not
# Carson's workbench — a note filed there is an ask FOR the increment, so it can
# never count as work-in-progress against it. That the box could stop the run it
# was asking for was the sharpest edge of the old behaviour. (claimbot reached
# the same conclusion independently with `:(exclude)queue`; this is that fix
# ported back to where the shape came from.)
# ---------------------------------------------------------------------------
snapshot_dirty() {
  git status --porcelain -z --no-renames -- . ':(exclude)queue' 2>/dev/null |
  while IFS= read -r -d '' entry; do
    path="${entry:3}"
    if [ -f "$path" ]; then
      printf '%s %s\n' "$(git hash-object -- "$path" 2>/dev/null || echo unreadable)" "$path"
    else
      printf 'absent %s\n' "$path"
    fi
  done | LC_ALL=C sort -k2
}

# Read the before-snapshot from $1, classify the after-snapshot arriving on
# stdin. Emits "MINE <path>" / "COLLIDE <path>" / "HIS <path>", one per line.
classify_dirty() {
  awk -v before="$1" '
    BEGIN { while ((getline l < before) > 0) { s = index(l, " "); h[substr(l, s+1)] = substr(l, 1, s-1) } }
    { s = index($0, " "); p = substr($0, s+1); hash = substr($0, 1, s-1)
      if      (!(p in h))    print "MINE " p
      else if (h[p] != hash) print "COLLIDE " p
      else                   print "HIS " p }'
}

WIP_SNAPSHOT="$(mktemp)"; trap 'rm -f "$WIP_SNAPSHOT"' EXIT
snapshot_dirty > "$WIP_SNAPSHOT"
wip_count=$(wc -l < "$WIP_SNAPSHOT")
[ "$wip_count" -gt 0 ] && say "$wip_count file(s) already dirty — Carson's, and none of them are mine to commit"

# The baseline is measured against the tree AS IT STANDS, uncommitted work and
# all. That is the recalibration: the ratchet compares the increment to what is
# actually in front of it tonight, not to the last commit. His changes move the
# bar; they do not stop the run.
before=$(count_tests); skips_before=$(count_skips)
if [ -z "$before" ]; then
  if [ "$wip_count" -gt 0 ]; then
    say "suite will not run and $wip_count file(s) are uncommitted — red on work in progress, which is not the job's to fix. Standing down."
  else
    say "suite would not run before starting — refusing to work on a red tree"
  fi
  exit 1
fi
say "suite at $before tests, $skips_before skipped"
HEAD_BEFORE=$(git rev-parse HEAD)

if [ "${RAPTOR_SKIP_JOB:-}" != "1" ]; then
  bin/raptor-job.sh dev || say "job failed (exit $?)"
fi

# The increment may have committed on its own. Undo any such commits without
# touching the working tree — `--soft` moves HEAD only, so Carson's uncommitted
# work stays exactly where it is — then unstage, so that everything the
# increment did shows up as plain working-tree dirt and can be classified path
# by path like anything else. Without this fold-back, work the job had already
# committed would be invisible to the snapshot and escape the ratchet entirely.
if [ "$(git rev-parse HEAD)" != "$HEAD_BEFORE" ]; then
  say "increment committed on its own — folding $(git rev-list --count "$HEAD_BEFORE"..HEAD 2>/dev/null) commit(s) back into the tree"
  git reset --soft "$HEAD_BEFORE" >/dev/null 2>&1 || true
  git reset -q >/dev/null 2>&1 || true
fi

after=$(count_tests); skips_after=$(count_skips)

CLASSIFIED="$(snapshot_dirty | classify_dirty "$WIP_SNAPSHOT")"
mine="$(printf '%s\n' "$CLASSIFIED" | sed -n 's/^MINE //p')"
collide="$(printf '%s\n' "$CLASSIFIED" | sed -n 's/^COLLIDE //p')"

if [ -n "$collide" ]; then
  say "COLLISION — the increment edited file(s) Carson had uncommitted:"
  printf '%s\n' "$collide" | while IFS= read -r p; do [ -n "$p" ] && say "    $p"; done
  say "  left exactly as they are: not committed, not reverted, his call."
fi

# Put back only what the job itself changed. Never `git reset --hard`: that was
# safe only because the old guard guaranteed an empty tree, and it is the single
# most destructive thing that could run at 02:30 over a human's unsaved work.
revert_mine() {
  [ -n "$mine" ] || return 0
  printf '%s\n' "$mine" | while IFS= read -r p; do
    [ -n "$p" ] || continue
    if git ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
      git checkout HEAD -- "$p" >/dev/null 2>&1 || true
    else
      rm -f -- "$p" 2>/dev/null || true
    fi
  done
}

# The ratchet. Never weaker: adding tests is the point, deleting or skipping them
# is how a suite stops meaning anything, and a job that can silence its own gate
# has no gate. Anything that trips this is reverted wholesale rather than argued
# with — the model does not get to explain why fewer tests is fine.
if [ -z "$after" ]; then
  say "suite does not run after the increment — reverting the increment's own files"
  revert_mine
elif [ "$after" -lt "$before" ] || [ "$skips_after" -gt "$skips_before" ]; then
  say "RATCHET: tests $before→$after, skips $skips_before→$skips_after — reverting the increment's own files"
  revert_mine
else
  # Explicit paths, one at a time. `git add -A` is what made the old guard
  # necessary in the first place, and it is not coming back.
  if [ -n "$mine" ]; then
    printf '%s\n' "$mine" | while IFS= read -r p; do
      [ -n "$p" ] && git add -- "$p" >/dev/null 2>&1
    done
  fi
  # The inbox lands with the increment: the notes that prompted the work belong
  # in the same history as the work.
  git add -A -- queue >/dev/null 2>&1 || true

  if ! git diff --cached --quiet; then
    n=$(git diff --cached --name-only | wc -l)
    git -c user.name=Raptor3000 -c user.email=raptor@localhost \
        commit -qm "nightly: $(date +%Y-%m-%d) — $before→$after tests" || true
    say "landed $(git rev-parse --short HEAD) · $before→$after tests · $n file(s)"
  else
    say "no change — a quiet night is a result"
  fi
fi

# Whatever happened above, his work is still sitting there uncommitted.
still=$(git status --porcelain -- . ':(exclude)queue' 2>/dev/null | wc -l)
[ "$still" -gt 0 ] && say "$still file(s) left uncommitted, as found"
exit 0
