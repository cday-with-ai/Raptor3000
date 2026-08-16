# Raptor3000 — notes for a session working in this room

A web FICS chess client. TypeScript, two packages: `shared` (protocol
parsing) and `web` (React UI). Mid-build, which is the normal state here.

`README.md` has the architecture, `DECISIONS.md` the standing rulings,
`PLAN.md` where the work got to. This file is the things a session needs
in the first five minutes, and the answers to questions Carson asks often
enough that re-deriving them wastes his evening.

## Gates

`yarn build` is the gate, **not** `tsc --noEmit`. They disagree: `tsc -b`
rejects things the noEmit check accepts, and a deploy has failed on
exactly that. Run `yarn build && yarn lint && yarn test` before saying
anything is done.

Live end-to-end specs live in `packages/web/e2e` and talk to real FICS.
They need a dev server on :5173 (`./run.sh`) and popups allowed
(`chromium.launch({ args: ['--disable-popup-blocking'] })`) — board
windows are opened by a FICS message arriving, not by a click, so the
popup blocker eats them otherwise. `e2e/guests.ts` is the shared harness;
read its comments before writing a new spec, they record the traps.

## "How many hits is Raptor getting?"

Asked often. The honest answer as of 2026-08-16: **the counter is
recording again, or it is not — check the dashboard.** What stands:

- The whole custom snippet is gone (2026-08-16, Carson: "turn analytics
  back on there, i don't care if you or e2e tests trigger it"). The
  gated beacon with token `f4e8c60b70ec4fad9fc757f436ce6549` was
  removed from `index.html`; Cloudflare Pages auto-injection (Workers &
  Pages → project → Metrics → Enable under Web Analytics) is back ON,
  server-side, and injects the correct token by itself. e2e runs pollute
  the numbers now — accepted, deliberately.
- The gate's whole premise was wrong anyway: RUM GraphQL returned **zero
  rows for every site in the account**, not just raptor — and the site
  EXISTS in the dashboard. The dead end is recorded in DECISIONS.md;
  don't re-open it.
- Never report zero as traffic: it is just as likely "no reads
  available". Numbers come from the dashboard, or via GraphQL with
  wrangler's OAuth token (below).

### Reading the numbers

Account is `ab98801338b2b2fb50627d026f693dda` (admin@chessascent.app).

Two credentials exist and they are not equivalent:

- `CLOUDFLARE_ANALYTICS_TOKEN` in `~/.secrets` — **broken**. Verifies
  active, and GraphQL answers *"not authorized for that account"*. Fix by
  minting a custom token as admin@chessascent.app with permission
  *Account | Account Analytics | Read* on that account.
- Wrangler's OAuth token in `~/.config/.wrangler/config/default.toml`
  (`oauth_token = "..."`) — **works for GraphQL reads.** Use it when you
  need an answer now.

The trap that hid this for a day: query RUM **with** an `accountTag`
filter and an unauthorized token gets back
`{"accounts":[{"rumPageloadEventsAdaptiveGroups":[]}]}` with
`"errors": null` — an empty dataset, byte for byte what a day nobody
visited looks like. Query **without** the filter and the same token is
refused outright. So `bin/usage-digest.sh` preflights with the unfiltered
`viewer { accounts { accountTag } }` query, and pages Carson if it cannot
see the account rather than reporting a quiet day. Never reintroduce a
path where "no access" can read as "no traffic".

## Deploying

`./bin/deploy.sh` (or `yarn deploy`) builds and ships to Cloudflare Pages,
then curls production. Deploying and `git push` belong to Carson's
interactive sessions — the nightly job is forbidden both (`jobs/dev.md`),
and that rule exists to stop an unattended agent widening its own mandate.

After a deploy, verify production is actually serving the new build
rather than trusting the success line: compare the asset hash in the live
HTML against `packages/web/dist/assets/`, and fetch the bundle itself.
Fetching the asset path can silently return the SPA fallback HTML, which
looks like the feature is missing when it is not.

## Working with Carson

He fires asks in bursts while you build. File each one in the hopper
queue (`q -Q raptor3000 add ...`) rather than trying to hold them, work
them FIFO, and **prune done tasks** — marking done without pruning leaves
the queue UI showing a wall of completed items, which reads as a queue
that was never drained.

`queue/suggestions.md` is his async inbox. The contract is that the run
which reads a note writes its answer underneath; never delete what he
wrote.

Launch the app and *look at it* before claiming a UI change works. The
toolbar clipping "Adjourn" to "Adjou" was found that way and by nothing
else — every test was green.
