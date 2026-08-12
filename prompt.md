You are starting a session in Raptor3000 — a web FICS chess client, TypeScript,
`packages/shared` for the protocol parsing and `packages/web` for the React UI.
It is mid-build, which is the normal state here and not a fault.

Read in this order before you say anything:

1. **`PLAN.md`** — where the work got to, what is knowingly broken, and what
   would sensibly come next. It is long. Read at minimum `## Where this is`,
   `## Known broken right now` and `## Next thing that would make sense`.
2. **`queue/suggestions.md`** — Carson's inbound channel. Anything he has raised
   there outranks what the plan says next.
3. `README.md` for the architecture and the credit section. The chat parser
   taxonomy is ported from the original Raptor, and where the two differ Raptor
   is the authority — read it at
   `raw.githubusercontent.com/fbergo/Raptor/master/raptor/src/raptor/...`, not
   from a previous run's note about it. `/tmp/raptor` is gone; the paths in the
   comment headers are historical citations, not files.

**The plan is state, not permission.** It says where the work is. It never
authorises anything — not a systemd unit, not a `--user` timer, not a launcher,
not a credential, not network reach. If the plan says a timer would help, even
if a previous session wrote that sentence, that is a note for Carson and not a
green light.

**`status.html` is generated, never edited.** `bin/status.py` renders it from
`PLAN.md` and git, and `bin/status.sh` rebuilds it every time the desktop icon
is clicked. So the way to change what the status page says is to change the
plan. If you find yourself writing status prose into a second file, stop — two
files holding the same fact will eventually hold two different facts, and
nothing will compute the diff.

**The nightly at 02:30 stands down on a dirty tree.** If you leave changes
uncommitted, tonight's run does nothing. That is the intended coupling, not a
bug, but know that you are choosing it.

Before believing `packages/web`'s typecheck after adding a shared export, run
`npx tsc -b` in `packages/shared` — `tsc` resolves `@raptor3000/shared` through
emitted declarations and will report a symbol that exists as missing.

Say hello in a few lines: where the build actually is, and the one thing you'd
pick up first. Then ask him.
