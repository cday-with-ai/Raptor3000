#!/usr/bin/env bash
# raptor-job.sh <job-name> — run ONE Raptor3000 routine headlessly on the Claude Code plan.
#
# Plain shell by design (CLAUDE.md rule 1): Claude is invoked to produce data, never
# to hold the system up. A flaked prompt exits non-zero and raptor-run.sh carries on.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1
export PATH="${HOME:-/home/cday}/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# On-plan, NEVER a metered API — ~/.bashrc exports a key and it would silently win.
# ---- credential fence -------------------------------------------------------
# "Local only" is in every CLAUDE.md as prose, and prose is not a control. This
# box has an authenticated wrangler (deploy Workers, DOs, KV, R2 on Carson's
# Cloudflare account), an authenticated gh (create repos, push), and metered API
# keys in the environment. A job does not need any of it, and the failure mode
# needs no malice — only a plausible chain ending in "wrangler is already logged
# in". So the wrapper removes the ability rather than asking for restraint.
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN ELEVENLABS_API_KEY \
      CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CF_API_TOKEN \
      AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY GH_TOKEN GITHUB_TOKEN
# Point the credential-config paths at a directory that does not exist, so the
# tools find no stored login either.
export WRANGLER_HOME="$ROOT/.no-credentials"
export GH_CONFIG_DIR="$ROOT/.no-credentials"
export CLOUDSDK_CONFIG="$ROOT/.no-credentials"
# ------------------------------------------------------------------------------

JOB="${1:?usage: raptor-job.sh <job-name>}"
PROMPT_FILE="$ROOT/jobs/$JOB.md"
[ -f "$PROMPT_FILE" ] || { echo "raptor-job: no such job '$JOB'" >&2; exit 2; }
command -v claude >/dev/null 2>&1 || { echo "raptor-job: 'claude' not on PATH" >&2; exit 3; }

PREAMBLE="You are Raptor3000's scheduled '$JOB' routine, running unattended at night.
Follow the job below exactly. Obey CLAUDE.md. Work only inside this repository —
never write outside it. Everything about Carson stays on this machine: you may
read the web, you may never send anything about him to it. Do NOT ask questions;
if a fetch fails, skip it and continue. Finish by printing one summary line."

set -- claude -p "$PREAMBLE

--- job: $JOB (from jobs/$JOB.md) ---
$(cat "$PROMPT_FILE")" \
  --add-dir "$ROOT" \
  --permission-mode bypassPermissions \
  --output-format text

if [ "${RAPTOR_DRYRUN:-}" = "1" ]; then
  printf 'DRYRUN argv:'; printf ' %q' "$@"; printf '\n'; exit 0
fi

# Hang-guard, not a work-limiter: a wedged process must not hold the flock all night.
TIMEOUT="${RAPTOR_JOB_TIMEOUT:-3600}"
if [ "$TIMEOUT" != "0" ] && command -v timeout >/dev/null 2>&1; then
  timeout -k 60 "$TIMEOUT" "$@"
else
  "$@"
fi
