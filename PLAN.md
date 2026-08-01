# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org; connector→board
seam test added 2026-08-01.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 115 unit tests pass.

The seam that let "boards don't work" and "everything is implemented" both be
true — no test crossed from raw server bytes to the position a board would
paint — is now covered as far as it can be without a DOM.
`packages/shared/src/services/__tests__/connectorBoardSeam.test.ts` feeds a
recorded observe session (real `\n\r` endings, `fics% ` prompts, a timeseal
ack, a `<12>` split mid-line across WebSocket frames) through
`FicsConnector.handleRaw` → `FicsParser` → `GameService`, with a listener
shaped exactly like `GameManager`'s, and asserts the board window would open,
the mode is OBSERVING, the decoded `position[rank][file]` codes are the ones
`BoardWindow` paints, no game-control line leaks into chat, and game-end
cleans up. What it cannot cover: the React render itself and real browser
popup blocking — those still need a DOM.

Learned while writing it, the hard way: a block arriving right after a
buffered `fics% ` prompt *without* a leading `\n\r` produces the single line
`fics% <12> ...`, which neither our parser nor Raptor's (checked against
`Style12Parser.java` on GitHub — `startsWith("<12>")`, no prompt stripping)
would recognize; the line leaks to chat and no board updates. Raptor's decade
of field use says FICS always sends the leading `\n\r`, so this is parser
parity, not a bug — but if a live session ever shows a board silently freeze
while raw `<12>` text appears in chat, this is the shape to look for.

Four bugs were fixed 2026-07-26, all found by reading raw server output rather
than code:

- `iset lock 1` sat third in the login bootstrap, so FICS refused the four isets
  after it. `Style 12 set.` still succeeded, which is why it hid — what silently
  went missing was `gameinfo`, the metadata sent when a game starts, and
  `startpos` for non-standard games. Moved to last.
- `set height 1000` rejected outright. Now 240, **unconfirmed** — the next
  connect will say.
- `<sr>` (seek removed) was missing from `GAME_CONTROL_PREFIXES`, so every
  withdrawn seek printed raw into chat once `seekinfo` was on.
- `openBoardWindow` discarded `WindowManager.open`'s return value, which is
  `null` when the browser blocks the popup. Board popups open in response to a
  `<12>` arriving from the server, which is not a user gesture, so browsers
  block them by default — making a blocked popup indistinguishable from a broken
  board.

## Known broken right now — not bugs to report

- **Drag and drop is unimplemented.** The README has it unticked. A board that
  renders a position but won't accept moves is the expected state.
- Engine, variants and Stockfish are unstarted.
- The e2e specs (`observe-bugs`, `two-guests-play`) need a live FICS connection
  and have not run since April.
- Dependencies are three months old; a cold `yarn dev` may want `yarn install`.

## Next thing that would make sense

**Confirm or kill the popup hypothesis**, because it's cheap and it decides
where everything else looks. Open the console before `obs`, then check for
`[GameManager] board window for game N was blocked by the browser`, or just look
for the blocked-popup icon in the address bar. This needs a human with a
browser; nothing offline can settle it.

- If blocked: allow popups for `localhost:5173` and the board should paint. The
  real fix is surfacing `onBoardWindowBlocked` in the UI so it never fails
  silently again.
- If not blocked and still no board: the fault is downstream of GameService —
  the transport, login sequence, Style 12 parsing, mode derivation and the
  GameService→GameManager listener contract are all now covered by tests, which
  narrows "downstream" to WindowManager/BoardWindow themselves.

After that, in rough order: check `set height 240` was accepted; treat
`Cannot alter:` and `Bad value given for variable` as errors during bootstrap
rather than chat (ten lines, would have caught two of the 2026-07-26 bugs on
the first connect instead of three months later); then drag and drop.

Offline work that remains available: `packages/web` already runs vitest in a
node environment (the Engine* tests live there), and `GameManager` is
React-free — a test with a stub `WindowManager` could cover the blocked-popup
path (`open` returns null → `onBoardWindowBlocked` fires) without installing
jsdom. Note the web suite is outside `bin/raptor-run.sh`'s ratchet, which
counts only `packages/shared`. A true `BoardWindow` render test would need
jsdom + testing-library added to the lockfile — a daytime decision, not a
nightly one.

## Notes for whoever picks this up

The server tells you things and nothing listens. Both login bugs on 2026-07-26
were reported by FICS in plain English during bootstrap and filed as ordinary
chat. When something here doesn't work, read the raw stream before reading the
code. There is still no recorded raw-traffic log in the repo; capturing one
live session to a file would make seam tests like the new one replay reality
instead of a reconstruction.
