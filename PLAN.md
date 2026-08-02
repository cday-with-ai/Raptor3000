# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org; connector→board
seam test added 2026-08-01; setting-rejection surfacing added 2026-08-02.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 122 unit tests pass.

FICS setting rejections no longer pass as ordinary chat. `FicsConnector` now
intercepts UNKNOWN chunks whose lines start with `Cannot alter:` or `Bad value
given for variable` (after stripping a buffered `fics% ` prefix) and publishes
them as INTERNAL `FICS rejected a setting: …` errors instead; other lines in
the same chunk still reach chat. It is session-wide, not bootstrap-scoped —
FICS gives no end-of-bootstrap signal, and those two lines are errors whenever
they occur. Patterns are line-anchored, so a tell quoting the phrase mid-line
cannot trip it. Either 2026-07-26 login bug would now surface on the first
connect, including the still-unconfirmed `set height 240`.

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

After that, in rough order: check `set height 240` was accepted (a rejection
now announces itself as an INTERNAL error — just read the console); fix the
chat-parser trim divergence below; then drag and drop.

Found 2026-08-02, verified empirically and against Raptor's Java: **real-shape
traffic defeats every anchored chat parser.** FICS blocks begin `\n\r`, so the
chunk handed to the chat chain starts with a newline (or a buffered `fics% `
prefix), and parsers like `TellEventParser` match `^user tells you:` against
the untrimmed chunk — `parseStream('\nSomePlayer tells you: hi\nfics% ')`
yields UNKNOWN, the bare line yields TELL. Raptor hands the chunk over
untrimmed too, but *every Raptor chat parser begins `text = text.trim()`* and
tokenizes on `" \r\n"` (checked `IcsParser.java` and `TellEventParser.java` on
GitHub); our port kept the untrimmed hand-off but dropped the per-parser trim.
Nobody noticed because UNKNOWN still prints in the console and per-type tab
routing isn't built yet — misclassified is not invisible, so chat "worked".
This is the natural next offline increment: restore the per-parser trim at
Raptor parity across the 22 chat parsers, with real-shape (leading `\n`,
prompt-prefixed) cases added to the existing parser tests. Touching all 22 is
why it was not folded into the 2026-08-02 change.

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
chat; as of 2026-08-02 those two rejection shapes are caught and surfaced as
errors. When something here doesn't work, read the raw stream before reading
the code. There is still no recorded raw-traffic log in the repo; capturing one
live session to a file would make seam tests like the new one replay reality
instead of a reconstruction.
