# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org; connector→board
seam test added 2026-08-01; setting-rejection surfacing added 2026-08-02;
chat-parser trim + prompt filtering restored 2026-08-03.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 258 unit tests pass.

The chat chain now survives real-shape traffic. Two pieces of Raptor that the
port had dropped are back, and they are separate fixes — each was verified to
be load-bearing on its own by reverting it and watching different tests fail:

- **Per-parser trim.** All 22 chat parsers now open with `const text =
  line.trim()` and carry the trimmed text onto the event, at parity with
  Raptor, where every parser begins `text = text.trim()`. The contract in
  `ChatEventParser.ts` states this, and it is deliberately 22 trims rather
  than one call in `FicsParser`: a parser must be correct when called
  directly, and a test asserts exactly that so the "simplification" gets
  caught.
- **Prompt filtering.** `FicsParser.parse` now begins with `filterPrompts`, a
  port of Raptor's `IcsConnector.filterTrailingPrompts`, which Raptor runs in
  `parseMessage` *before* `IcsParser.parse`. It strips a stack of leading
  `fics% ` echoes and one trailing prompt. Trim alone does not cover this:
  `parseStream` flushes at the last newline, so a block's trailing prompt has
  no newline after it, stays in the line buffer, and arrives glued to the
  *front* of the next chunk, where trimming cannot reach it.

`packages/shared/src/parsers/__tests__/realShape.test.ts` is the table: 26
message samples covering all 22 parsers × 4 shapes each — bare line, leading
newline, block with trailing prompt, buffered prompt glued to the front —
plus direct-parser cases and prompt-filter edge cases. A new parser that
forgets the trim fails there.

One existing test changed meaning rather than being deleted.
`settingRejections.test.ts` had a case named "never fires on a mid-line quote,
**even when the tell lands as UNKNOWN**", whose own comments said "currently"
and "does not yet" — it had pinned the bug alongside the behavior it was
guarding. With the tell now classifying correctly it asserts TELL instead, and
a separate case was added using server text no parser claims, which is what
actually exercises the interceptor's line anchoring. Worth watching for: a
test whose comments hedge in the present tense is usually holding a bug in
place.

Fixed in passing, and pinned in the seam test: the `fics% <12> ...` shape.
The 2026-08-01 note called this parser parity rather than a bug, on the
grounds that Raptor's `Style12Parser.java` also does a bare
`startsWith("<12>")`. That reasoning was wrong in a way worth remembering —
Raptor's Style12 parser never sees a prompt because the connector stripped it
one layer up, so the comparison was against the wrong layer. The prompt
filter fixes it for us at that same layer.

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

Found while writing that test, and fixed 2026-08-03 by the prompt filter
described above: a block arriving right after a buffered `fics% ` prompt
*without* a leading `\n\r` produces the single line `fics% <12> ...`, which
`startsWith("<12>")` cannot see; the line leaked to chat and no board
updated. The seam test now feeds exactly that shape and asserts the board
opens anyway.

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
now announces itself as an INTERNAL error — just read the console); the
`says:` gap noted below; then drag and drop.

Learned from reading Raptor's Java this run, and not yet acted on:
**`TellEventParser.java` also matches `says:`** — the in-game form — and emits
`ChatType.TELL` for it. Our port handles only `tells you:`, so a `says:` from
an opponent mid-game currently falls through to UNKNOWN. Small, offline,
testable; a good next increment.

Also noted: `startsWithOrOffset1` (used by Finger/History/Journal/Variables/
Told/Notification) existed to tolerate the single leading whitespace char that
the trim now removes. Its offset-1 branch is no longer doing that job, and
what it still permits is a *spurious* leading character — `XFinger of Bob`
would match. It is Raptor's own idiom so it was left alone, but it is now
tolerance without a purpose, and tightening it is a real if minor cleanup.

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
