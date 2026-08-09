# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org; connector→board
seam test added 2026-08-01; setting-rejection surfacing added 2026-08-02;
chat-parser trim + prompt filtering restored 2026-08-03; the `says:` tell form
added 2026-08-04; blocked board popups made visible 2026-08-05; tab-prefix
doubling fixed, the `/` panes made scrollable, theme changes taught to
reach open popups, and the dead board-toolbar buttons made to look dead
2026-08-09.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 289 unit tests pass in `packages/shared`, 59 in `packages/web`.

**`queue/suggestions.md` has a large 2026-08-05 note from Carson, answered
2026-08-09 but only one item of it acted on.** That file now carries better
diagnosis of the UI layer than this plan does — read it before deciding what
to do next, and prefer it to the "next" section below, which is about the
board popup and has been blocked on a human since 2026-07-26. Its triage, in
short: the Options page writes seven preferences that nothing reads
(`loadPreferences` is called once, in `OptionsPage`), which is the root of both
the piece-set and theme complaints; every board toolbar button is decorative
because `TbButton` takes no `onClick`; theme changes never reach already-open
popups. The pane-clipping, theme-propagation and dead-toolbar items on that
list are done (below); **what remains of it needs either a browser or a
consumer wired into the renderer**, and the Options page talking only to
itself is the biggest of them.

**The board toolbar no longer advertises buttons that do nothing.** All 20 of
them are still unwired — that part is unchanged — but they now render
`disabled`, at 0.4 opacity, with a `not-allowed` cursor and a title saying
`<label> — not implemented yet`. This is the interim Carson asked for, not a
fix: a control that looks live and does nothing reads as a broken app, whereas
a greyed one reads as an unfinished one, which is what this is.

The buttons moved out of JSX and into `packages/web/src/windows/boardToolbar.ts`
as data — `toolbarLayoutFor(mode)` returns `{left, right}` of
`{id, label, implemented}`, and `toolbarButtonProps(item)` is the rule that
turns an item into what `TbButton` renders. That split is what lets the mode →
buttons mapping be asserted with no DOM; `Toolbar` is now a map over two arrays
and `TbButton` takes an item instead of children. `implemented` is a claim
about a handler existing and there is nothing that can check it — it is the
wiring commit's job to flip it, and flipping it early gets you back the exact
bug this removed.

The 14 tests in `packages/web/src/windows/__tests__/boardToolbar.test.ts` pin
the per-mode button sets (including SETUP replacing the toolbar rather than
adding to it, and the engine toggle appearing exactly where
`engineAnalysisAllowed` says), and pin the dimming rule on *synthetic* items
with `implemented` both ways rather than on the real all-false ones — so the
first commit that wires a button doesn't have to edit tests it didn't break.
Both halves verified by sabotage: making the dead branch `cursor: 'pointer'`
reddens 2, widening the engine toggle to "any mode but PLAYING" reddens 2.
What they cannot see is the render — whether a `disabled` attribute actually
reaches the DOM still needs jsdom.

**A theme change now reaches windows that are already open.** `applyTheme`
writes `document.documentElement.dataset.theme` on whichever document called
it, and board/chat windows are real `window.open` popups with their own
documents — so a popup took the palette at open time and then went stale, OS
flips included, since `watchSystemTheme` was subscribed only in `MainWindow`.
`installThemeSync` in `theme.ts` is what every document now runs, once, from
`main.tsx`: apply the stored mode immediately, then re-apply on a `storage`
event for the theme key or on an OS flip. Same-origin windows share the
localStorage the mode already lived in, so no registry of popup handles is
needed and no window has to know the others exist — Carson's own sketch of the
fix, and it fit.

Two things about it that are load-bearing and read as redundant:

- **`MainWindow` still applies the theme itself.** A `storage` event does not
  fire in the window that wrote the value, so the sync cannot see the main
  window's own edit. It only *carries* it. Deleting that `applyTheme` call
  breaks the window doing the changing and nothing else, which is a nasty
  shape to debug.
- **The OS listener is not gated on `mode === 'system'`.** Re-applying an
  explicit `light`/`dark` is a no-op, whereas a gated listener would have to be
  torn down and rebuilt whenever the mode changed to notice that another window
  had selected `system`. A test pins exactly that sequence.

`installThemeSync` takes a `ThemeEnvironment` — read mode, resolve, reflect,
subscribe to storage, subscribe to OS — defaulting to the browser one. That
seam is why the 11 tests in `packages/web/src/__tests__/themeSync.test.ts` run
in the `node` environment vitest is configured for here, with no jsdom. One of
them installs two syncs over two fake documents and fires one event, which is
the arrangement the popups actually depend on. Both halves were verified to
bite by sabotage: dropping the storage re-apply reddens 5, gating the OS
listener reddens 2. What they cannot see is whether a real `storage` event
crosses windows and whether CSS repaints — that needs a browser.

**The `/` panes scroll.** Help, Options and Seek clipped everything past the
viewport. `packages/web/src/windows/shellStyles.ts` now holds the shell's
layout skeleton — `pageShell`, `pageHeader`, `footer` and a `scrollPane` base
the three panes spread — and the panes are built from it rather than each
declaring `flex: 1` inline. Three things had to be true together, which is why
this had survived looking like a one-liner: the pane needs `overflow: 'auto'`
*and* `minHeight: 0` (a flex child's default `min-height: auto` won't shrink
below its content, so overflow alone never has anything to do), and the column
above it has to be bounded — `pageShell` was `minHeight: '100vh'`, which grows
with its content and therefore never over-constrains the pane. Header and
footer are `flexShrink: 0` so the squeeze lands on the pane. Seek got the same
treatment: Carson only named Help and Options, but it was the third instance of
the identical shape in the same shell.

`packages/web/src/windows/__tests__/shellLayout.test.ts` walks the module's
exports rather than a fixed list, so any pane added there later with `flex: 1`
must carry the pair or fail. Verified by deleting `minHeight` and watching four
cases go red. What it cannot see is a pane declared inline in a component —
having the growing panes in one module is what gives that check somewhere to
stand. And it asserts what the shell hands React, not layout: a real scroll
still needs a browser.

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

Offline work that remains available, in rough order of what a night can
finish: `WindowManager`, the last React-free piece with no tests.
`featuresFor`, `urlFor`, `storageKeyFor` and the cascade maths are pure
string/number work; they need `window.screen` and `localStorage`, which are a
few lines of stub, not jsdom. Then the smaller loose ends named elsewhere here:
the stale `chessAlg.ts:122` comment, the Seek panel's hardcoded
`#1b1f26`/`#2a313c` which stay dark in day mode, and `startsWithOrOffset1`'s
now-purposeless offset branch. A true `BoardWindow` render test *would* need
jsdom + testing-library added to the lockfile — a daytime decision, not a
nightly one, and it is now what stands between the toolbar tests and proof that
a `disabled` button reaches the screen.

Note the web suite is outside `bin/raptor-run.sh`'s ratchet, which counts only
`packages/shared`. Tests added there are real but unguarded: nothing reverts a
run that deletes them — and four consecutive nights have now landed their
increment there (34 → 59 web tests since 2026-08-05) while the ratcheted count
sat still at 289. That is not a fault in the work, but it does mean the gate
has been watching an untouched suite, and the streak is now long enough that
the honest reading is that the offline work left in this project is nearly all
in `packages/web`. `count_skips` does scan `packages/*/src`, so silencing one
is still caught.

`npx tsc --noEmit` in `packages/web` is red on two pre-existing unused-symbol
errors in `EngineManager.test.ts` (an unused `BoardMode` import and an unused
`_mgr` binding, both TS6133). They predate 2026-08-05 and were left alone
rather than swept up mid-increment, but they mean `yarn typecheck` there
cannot currently be used as a gate. It is still worth running: those two lines
are the whole expected output, so anything else in it is yours.

`yarn lint` in `packages/web` does not run at all — the script calls eslint 10,
which wants a flat `eslint.config.js`, and there is no eslint config anywhere in
the repo. Not worth fixing mid-increment; worth not mistaking for a clean lint.

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
