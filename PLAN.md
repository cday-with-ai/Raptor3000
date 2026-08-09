# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org; connector→board
seam test added 2026-08-01; setting-rejection surfacing added 2026-08-02;
chat-parser trim + prompt filtering restored 2026-08-03; the `says:` tell form
added 2026-08-04; blocked board popups made visible 2026-08-05; tab-prefix
doubling fixed 2026-08-09.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 289 unit tests pass in `packages/shared`, 22 in `packages/web`.

**`queue/suggestions.md` has a large 2026-08-05 note from Carson, answered
2026-08-09 but only one item of it acted on.** That file now carries better
diagnosis of the UI layer than this plan does — read it before deciding what
to do next, and prefer it to the "next" section below, which is about the
board popup and has been blocked on a human since 2026-07-26. Its triage, in
short: the Options page writes seven preferences that nothing reads
(`loadPreferences` is called once, in `OptionsPage`), which is the root of both
the piece-set and theme complaints; every board toolbar button is decorative
because `TbButton` takes no `onClick`; the help and options panes clip their
overflow; theme changes never reach already-open popups. The scroll fix and the
theme `storage`-event plumbing are the two that look nightly-sized.

**A tab no longer doubles a prefix the user typed.** Typing `tell 39 hi` in the
channel-39 tab sent `tell 39 tell 39 hi`, because the prefix is applied at send
time here rather than pre-inserted into the input widget as Raptor does it, so
nothing could see that the user had already typed it. `applyTabPrefix` in
`stores/TabPrefix.ts` now treats a leading copy of *this tab's own* command and
target as the prefix. Two call sites were prepending independently —
`ChatTabStore.sendInput` and `ChatWindow.tsx`'s `submit`, which is the one the
popup actually uses; fixing only the store would have been invisible. Three
bounds are deliberate and pinned by tests: one occurrence stripped, this tab's
target only (`tell 40` in the 39 tab still doubles, visibly, rather than
silently redirecting and then being dropped by the tab's own echo filter), and
no abbreviation matching. A test asserts the de-duplicated outbound still
satisfies `ChannelTabStore.accepts`, so the echo can't fall out of its own
transcript.

`TabPrefix` had no callers before this — `ChatTabStore` and `ChatWindow` each
built the same strings inline. They still do for the tab's `prefix` field; only
the application of it is shared now.

**A blocked board popup now announces itself in the app.**
`onBoardWindowBlocked` was a hook nobody ever assigned — the blocked branch
wrote a `console.warn` and stopped, so answering "is the popup being blocked?"
required devtools to be open *before* the `obs` that triggered it, which is
most of why the question has stayed open since 2026-07-26. `GameManager.ts`
now exports `announceBlockedBoardWindows`, which routes the hook to an
INTERNAL chat event — the same channel the setting rejections use, and the
main console tab accepts everything — and `createContext` wires it for the
main window. The board still doesn't paint when blocked; the difference is
that the console tab says why.

`TellEventParser` now matches both forms FICS sends. `says:` — the in-game
form, which `say` delivers to your opponent and, in bughouse, to both partners
— classifies as TELL alongside `tells you:`, which is what Raptor does: its
`TellEventParser.java` tests `s2.equals("says:")` as the *first* branch and
emits `ChatType.TELL`, and there is no separate SAY anywhere in `ChatType`.
Before this, every `say` from an opponent matched nothing in the chain and
printed as UNKNOWN — the one chat form you are guaranteed to meet while
actually playing a game. The real-shape table carries it through all four wire
shapes, and a case pins that `GMBob (your partner) says: …` still reaches
`PartnerTellEventParser`, which sits ahead in the chain and keys on `(your`.

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

`packages/shared/src/parsers/__tests__/realShape.test.ts` is the table: 27
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

`packages/web/src/game/__tests__/GameManager.test.ts` covers the segment past
where the shared seam test stops. The shared test asserts against a listener
*shaped like* GameManager's; this one uses the real GameManager with a stub
`WindowManager` whose `open` returns null on demand, which is precisely how a
browser reports a refused popup. Nine cases: one window per game and no
reopen on later moves, all three of playing/examining/observing opening a
board, observed games surviving game-end while examines close, dispose
silencing it, and the blocked path both firing the hook and producing exactly
one INTERNAL notice with the game id — plus a case pinning that a normal open
says nothing. No DOM needed; the stub is two methods.

Pinned deliberately rather than changed: when the popup is blocked the game
still lands in `getOpenGameIds()`. GameManager tracks games it wants windows
for, not windows that exist, and `WindowManager.open` focuses an existing
window on a repeat call, so a retry works. If that set ever starts being read
as "windows currently on screen", this is where it will lie.

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

Carson's 2026-08-05 note (summarised above, in full in `queue/suggestions.md`)
now describes more of the real state of the UI than this section does. What
follows is still true and still blocked.

**Confirm or kill the popup hypothesis**, because it's cheap and it decides
where everything else looks. It still needs a human with a browser — nothing
offline can settle it — but as of 2026-08-05 it no longer needs devtools open
in advance. Run `obs` on any game and read the main chat console: `Board
window for game N was blocked by the browser` appears there if it was blocked.
Silence in the console with no board means it was not blocked.

- If blocked: allow popups for `localhost:5173` and the board should paint.
- If not blocked and still no board: the fault is downstream of GameService.
  The transport, login sequence, Style 12 parsing, mode derivation, the
  GameService→GameManager listener contract, and now GameManager's own
  open/close/blocked behavior are all covered by tests, which narrows
  "downstream" to `WindowManager.open` itself (URL, window features, the
  position maths) and `BoardWindow`'s render. Neither has a test, and both
  need a DOM.

After that, in rough order: check `set height 240` was accepted (a rejection
now announces itself as an INTERNAL error — just read the console); then drag
and drop.

**Raptor's source is no longer at `/tmp/raptor`.** Comment headers all over
this codebase cite paths like
`/tmp/raptor/raptor/src/raptor/connector/ics/chat/ChatEventParser.java`, and
that tree is gone — those are historical citations, not something to open.
Upstream is readable at
`raw.githubusercontent.com/fbergo/Raptor/master/raptor/src/raptor/...`, which
is where `TellEventParser.java` was checked against this run rather than
trusting the previous run's note about it. The note was right, but the layer
mistake of 2026-08-01 is cheap to repeat and cheaper to avoid.

**A divergence left open deliberately, now that it is understood.** Raptor's
tell parser decides on tokens — `RaptorStringTokenizer(text, " \r\n")`, then
token 2 is `says:`, or tokens 2–3 are `tells` `you:` — with a `length < 600`
guard and no constraint at all on the handle token, `stripTitles` cleaning it
afterwards. Our port is a line-anchored regex requiring a 3–17 letter handle
and titles shaped `([A-Z*]+)`, with no length guard. Three consequences, none
of which this run changed:

- Raptor tolerates whatever decoration FICS hangs on the name; we do not. If a
  `says:` ever shows up unclassified in the wild, this is the first suspect,
  and the fix is to stop constraining the handle rather than to guess at the
  decoration.
- `FicsParser` hands the chat chain the **whole remaining chunk**, not a line
  (step 7 of its flow, Raptor parity). Raptor's tokenizer therefore claims a
  multi-line chunk on the strength of its first line; our `^…$` cannot. Ours
  is the narrower and probably safer of the two, but they are not the same
  parser and the difference only shows on multi-line traffic.
- Widening the verb to `(?:tells you|says):` was chosen over porting the
  tokenizer precisely because the tokenizer form is broader in these two ways
  at once, and TellEventParser sits 7th of 22 in the chain where broadening is
  how you quietly steal another parser's traffic. Every later parser keys on a
  different token 2, so `says:` itself is safe — that was checked, not assumed.

Also noted: `startsWithOrOffset1` (used by Finger/History/Journal/Variables/
Told/Notification) existed to tolerate the single leading whitespace char that
the trim now removes. Its offset-1 branch is no longer doing that job, and
what it still permits is a *spurious* leading character — `XFinger of Bob`
would match. It is Raptor's own idiom so it was left alone, but it is now
tolerance without a purpose, and tightening it is a real if minor cleanup.

Offline work that remains available: `WindowManager` is the last React-free
piece with no tests. `featuresFor`, `urlFor`, `storageKeyFor` and the cascade
maths are pure string/number work; they need `window.screen` and
`localStorage`, which are a few lines of stub, not jsdom. A true `BoardWindow`
render test *would* need jsdom + testing-library added to the lockfile — a
daytime decision, not a nightly one.

Note the web suite is outside `bin/raptor-run.sh`'s ratchet, which counts only
`packages/shared`. Tests added there are real but unguarded: nothing reverts a
run that deletes them. `count_skips` does scan `packages/*/src`, so silencing
one is still caught.

`npx tsc --noEmit` in `packages/web` is red on two pre-existing unused-symbol
errors in `EngineManager.test.ts` (an unused `BoardMode` import and an unused
`_mgr` binding, both TS6133). They predate 2026-08-05 and were left alone
rather than swept up mid-increment, but they mean `yarn typecheck` there
cannot currently be used as a gate.

**Typechecking `packages/web` reads shared's `dist`, not its source, and
`dist` is gitignored.** The tsconfig project reference `{ "path": "../shared" }`
makes `tsc` resolve `@raptor3000/shared` through the emitted declarations, so a
symbol added to `packages/shared/src` shows up in web as `has no exported
member` until `npx tsc -b` is run in `packages/shared`. Vite is not affected —
`package.json` `main` points at `src/index.ts`, so the running app always sees
source. Cost ten minutes on 2026-08-09 chasing an export that was already
there. Anything that adds a shared export must rebuild shared before believing
web's typecheck.

## Notes for whoever picks this up

The server tells you things and nothing listens. Both login bugs on 2026-07-26
were reported by FICS in plain English during bootstrap and filed as ordinary
chat; as of 2026-08-02 those two rejection shapes are caught and surfaced as
errors. When something here doesn't work, read the raw stream before reading
the code. There is still no recorded raw-traffic log in the repo; capturing one
live session to a file would make seam tests like the new one replay reality
instead of a reconstruction.

Seen once on 2026-08-04 and worth recognising rather than chasing: `npx vitest
run` printed all 267 passes and the duration line, then died with `FATAL
ERROR: v8::ToLocalChecked Empty MaybeLocal` in `cjsPreparseModuleExports` —
node's own ESM/CJS loader, during teardown, after the results. Three
consecutive re-runs were clean and exited 0. It is not in this project's code
and it did not affect the result, but note where it would hurt if it recurs:
`count_tests` in `bin/raptor-run.sh` greps the output for the count, so a crash
*before* the summary prints would yield an empty `after` and revert a
perfectly good increment. If a night ever reverts for no visible reason, this
is the thing to suspect first.
