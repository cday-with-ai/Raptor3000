# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org; connector→board
seam test added 2026-08-01; setting-rejection surfacing added 2026-08-02;
chat-parser trim + prompt filtering restored 2026-08-03; the `says:` tell form
added 2026-08-04; blocked board popups made visible 2026-08-05; tab-prefix
doubling fixed, the `/` panes made scrollable, theme changes taught to
reach open popups, the dead board-toolbar buttons made to look dead, and
`WindowManager` given its first tests, restored window positions clamped
to the screen that currently exists, the two window-position writers made
to share one declaration of where they write, the prefix parsers' leading-
character tolerance narrowed to whitespace, the theme-var migration
finished across the UI, and black's castling taught to highlight its own
back rank, 2026-08-09.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 321 unit tests pass in `packages/shared`, 159 in `packages/web`.

**The board is Chess Ascent's board now, and it plays (2026-08-12).** The
full visual port from chessascent.app — its color themes plus the custom
picker (brown default), its five piece SVG sets (cburnett default), its
4px-rounded, light-mode-shadowed chrome, its in-square coordinates, its
board-width info bands, its measured perfect-square sizing — plus a
pointer-events port of its drag-and-drop (10px threshold so taps stay
taps; click-to-move, premove and the promotion picker all route through
the same path; touchAction:none for mobile). Verified against live FICS
the same day as an anonymous guest: a synthetic pointer drag e2→e4 on an
examine board came back from the server as `P/e2-e4`, and a live observed
game rendered with the ported colors, coordinates, chrome and SVGs — all
asserted from the DOM, not eyeballed. Board popups pick up options-page
changes live via storage events. Legal-move dots are NOT ported: this
client has no client-side move generator, so illegal moves are FICS's to
reject (it does, and the IllegalMoveMessage parser exists).

**"Won't connect to FICS" was three bugs wearing one symptom (2026-08-12).**
FICS allows one session per handle. Registered handles: a new login wins and
the incumbent is kicked ("kicking them out" to the winner, "you can't both be
logged in" to the loser). Unregistered handles: the incumbent wins and the
newcomer is refused. With auto-connect on, every main-window document load —
new launches (run.sh opens a new tab each time and old tabs stay live),
reloads, Vite full-reloads of background tabs — logged in as the account and
kicked whichever session had it, so at any moment the window being looked at
had usually just lost. Three code changes, all landed:

1. **Login is confirmed, not assumed.** The connector used to set `authed`
   the moment it *sent* the password, then blast the 15 bootstrap commands.
   A rejected password or refused guest name left it deaf, feeding `iset`
   commands into a login prompt until FICS timed the connection out —
   which read as "never connected". Now only the server's
   `**** Starting FICS session as <name> ****` line makes the session
   authed; `Invalid password` and the handle-collision verdicts (both
   directions) surface as INTERNAL console lines, land in a terminal
   `failed` stage, and never auto-retry. The console stays live in
   `failed`, so a login can be finished by hand by typing into it.
2. **The twin-context bug — connected but silent.** `MainWindowRoot`'s
   `useState` initializer created the context with a side effect
   (`window.raptor = c`), and StrictMode runs initializers twice: the tree
   kept one context while `window.raptor` — what the chat popup resolves
   through `window.opener` — pointed at its twin. The popup rendered the
   twin's forever-empty main console ("Connecting to FICS… events will
   appear here.") while the real session scrolled unseen. Surfaced by the
   React 19 upgrade. The initializer now reuses `window.raptor` if set, so
   both StrictMode runs return the same context and the twin (and its
   never-connected FicsConnector) is never created.
3. **Unload logs out.** `beforeunload` now calls `connector.disconnect()`
   (best-effort `quit` + close) before dropping `window.raptor`, so a
   reload frees the account instead of leaving a ghost session FICS has to
   kick on the next login. A **Reconnect** button in the Options SESSION
   panel re-runs login with the current session's creds — the manual "take
   the account back" after being kicked; it no-ops while connected.

What is deliberately NOT here yet: a cross-tab lock (BroadcastChannel) so a
background tab doesn't re-login after a Vite full-reload while another window
holds the account. With disconnect-on-unload and confirmed login the war is
mostly defused; the lock is the remaining piece if two long-lived windows are
ever wanted at once. The exact registered-side farewell line is matched
tolerantly (`/you can'?t both be logged in/i`) — the kicker-side and
session-start lines were captured live on 2026-08-12, the guest-refusal
wording was not (the socket closed before it was logged), so its test pins
our regex, not verified server text.

**A black castle no longer highlights white's back rank.** `parseLanMove`
resolved both `o-o` and `o-o-o` to `e1`→`g1` / `e1`→`c1` unconditionally, and
its one caller — `BoardWindow.tsx:268`, the last-move highlight — took it at
its word. So every time either side castled, the two lit squares were white's,
which for a black castle means lighting a square the white king is very
probably still standing on while the piece that actually moved sits unmarked
two ranks away. It is the one field in Style12 that carries no rank of its
own: FICS writes the verbose move as bare `o-o` for both colours, and the
`(0:03.100)` and SAN fields after it say nothing about who moved either.

`parseLanMove(lan, moverIsWhite)` now takes the colour, and it is **required**
rather than defaulted. A default here is a wrong answer half the time instead
of a missing one, and the wrongness is silent — the board simply highlights
the wrong two squares. Since the only information a caller needs is one flag
it already holds, requiring it costs nothing and closes the shape of the bug.

`lastMoveSquares(s12)` is the second half, and the more important one:
`isWhitesMoveAfterMoveIsMade` is the turn *after* the move, so the mover is
the other colour, and a caller that passes the flag straight through gets
exactly the original bug back with a plausible-looking argument at the call
site. The negation now happens in one function that takes the Style12 itself.
`BoardWindow` calls that, not `parseLanMove`.

The 9 new tests are 6 in `chessAlg.test.ts` — both castles for both colours,
the uppercase forms, that the colour flag cannot move an ordinary move's
squares, promotions (`P/e7-e8=Q` yields e7→e8; the regex is unanchored on
purpose, which is also why the promoted piece is dropped), malformed fields,
and the polarity of `lastMoveSquares` in both directions — plus 3 assertions
folded into a new seam case. The seam one is the one worth keeping: it feeds a
recorded `<12>` for the position after 1.e4 e5 2.Nf3 Nf6 3.Bc4 Bc5 4.d3 O-O
through the whole connector chain and asserts that the piece standing on the
square the board is about to highlight *is* the king that moved. Black has
castled and white has not in that position, so the two back ranks disagree and
the old behaviour cannot pass. Both halves verified by sabotage: hardcoding
the back rank to `1` reddens 4, dropping the `!` in `lastMoveSquares` reddens
3.

Checked upstream rather than assumed, and it changed the reasoning: **Raptor
never parses `lan` at all.** `IcsUtils.java` works from `san` through
`game.makeSanMove`, and `Style12Message.lan` has no reader. So there is no
Raptor behaviour to be at parity with here — `parseLanMove` is ours, and the
reason Raptor never hit this bug is that it has a move generator and we do
not. If the ChessAPI port ever lands, this function is a candidate for
deletion rather than extension.

Also fixed while in the file, since it is the same "who just moved" reasoning:
the comment above the en-passant rank in `style12ToFen`, which described the
`'3'` branch while sitting above a line that yields `'6'` first. Carson flagged
it on 2026-08-05 as reading like a bug and not being one. It now describes both
branches in the order they appear.

**Day mode now actually reaches the UI.** The theme sync landed three runs ago
and worked; what it could not do was repaint a property that was never written
as a `var(--…)` in the first place. About thirty inline styles were hex
literals copied straight out of the *dark* half of the palette — every window
divider (`#2a2f38` = `--border-soft`), every control outline (`#3a4150`), the
chat tab underline and the outbound-message colour (`#7bb8ff` = `--accent`),
the `App`/`BoardLayout` full-window background and foreground (`#15181d`,
`#e8eaef`), the promotion popover, and the Seek placeholder panel this file
has been listing as a loose end since 2026-08-05. Flipping to Day gave a white
page with dark borders and dark panels on it. They all read the palette now.

`--border-strong` is new in `index.css`, in both blocks. It exists because
`#3a4150` was already in use as the outline of a control that has to read as
raised — button, input, popover — and the only var carrying that value was
`--scroll-thumb-hover`, which is a different idea that happens to be the same
colour. Three border weights now: `--border` between panes, `--border-soft`
between rows inside one, `--border-strong` around a control.

What was deliberately *not* converted, because it is a design decision rather
than a mechanical one: colours that are not in the palette at all. The board
squares and their highlight set (which already carry their own light/dark
pair, keyed on square parity, not on theme), the clock's running-green and
low-time-red, `colorFor`'s per-chat-type greens and ambers, the login error
red. Several of those are chosen for a dark background and will read poorly in
Day mode — the chat greens especially — but giving them theme-aware values
means picking new colours, and a night that quietly restyles chat is a night
whose diff nobody can check. One literal is exempted rather than unconverted:
the "waiting for position" overlay text is `#15181d` because it sits on the
board, whose squares are mid-to-light in either theme, so `var(--fg)` would
make it vanish in dark mode. The reason is in a comment at the line and in the
test's exemption list, which must agree.

The 26 tests in `packages/web/src/__tests__/themeVars.test.ts` are a lint that
happens to be a test, which is the only form of it available with no eslint
config in the repo. It parses `index.css` as the source of truth for what the
palette is, then reads every `.ts`/`.tsx` under `src` and fails on any hex
literal equal to a dark-palette value, naming the var to use instead. Four
things about it are load-bearing: it asserts every var is declared in *both*
blocks (a var present only in the dark block still resolves in light mode —
`:root` matches too — so it silently keeps its dark value, with no browser
warning and one stubborn dark element as the only symptom); it asserts no var
has the same value in both themes, since such a var does nothing; it asserts
the file walk found something, or every per-file check passes vacuously; and
it fails on a *stale* exemption, so the list cannot outlive the line it was
written for. Verified by sabotage: restoring one `#2a2f38` reddens 1 with the
file and line in the message, deleting `--border-strong` from the light block
reddens 1, converting the exempted overlay literal reddens 1.

That test reads files from disk, so `packages/web` needed `@types/node` — it
was already in the lockfile via shared and in `node_modules`, so adding the
same `^20.11.0` specifier to `package.json` and `"node"` to the tsconfig
`types` array resolved with no install and no lockfile change. Side effect
worth knowing: node globals are now visible to all of web's source, not just
its tests, because there is no separate tsconfig for tests. Nothing stops
browser code importing `node:fs` and failing at runtime instead of at compile
time.

**Six chat parsers no longer classify a line that opens with a spurious
character.** `XFinger of Bob` was a FINGER event, `X(told alice)` a TOLD, and so
on for History, Journal, Variables and Notification. The cause was the
`startsWithOrOffset1` helper this file flagged last run as "tolerance without a
purpose": Raptor's parsers test `startsWith(X) || startsWith(X, 1)` because
Raptor does **not** trim before the check — `FingerEventParser.java` runs it on
the raw block, whose first character may be a newline; that was read upstream
this run rather than assumed, and it is the same layer mistake as 2026-08-01,
caught early this time. Our parsers each trim first, so the only character the
offset-1 branch could ever have skipped was one trim had already declined to
remove, which is to say never whitespace.

`offsetAfterPrefix(text, prefix)` replaces it in `IcsUtils.ts`: skip one
*whitespace* character and nothing else, and return the index past the prefix,
or -1. Returning the offset is the other half of the change — each of the six
call sites used to decide "did it match" and then recompute "where does the
payload start" from a second `startsWith`, five of them with an identical
ternary, and those two could disagree. They are now two lines each and cannot.
The whitespace branch is unreachable through `FicsParser` (the trim gets there
first) and is kept because a parser is contractually correct when called
directly, which is where untrimmed text can still arrive.

The 17 tests are in
`packages/shared/src/services/__tests__/prefixTolerance.test.ts`: the helper's
offsets both ways, the six spurious-character lines falling to UNKNOWN through
the chain, the same six standalone, and the positives so this doesn't read as
the parsers getting stricter about whitespace — they didn't, the trim still
handles it. Both halves verified by sabotage: restoring the any-character skip
reddens 8, dropping the `+ 1` from the whitespace offset reddens 3.

Pinned rather than changed while in there: `NotificationEventParser` has a
second check on the *untrimmed* line that drops anything ≥ 600 chars unless the
prefix sits at offset 1. That is Raptor's operator precedence showing through —
`text.length() < 600 && startsWith(N) || startsWith(N, 1)` — so a genuinely
long notification starting at offset 0 is discarded upstream too. A test says so
in case it later looks like a local typo.

**Correction to last run's note, which was wrong.** `startsWithAt` in the same
file was recorded here as having "no callers anywhere" and being safe to
delete. It has one: `BugWhoAllEventParser.ts:20`. Deleting it would have broken
the build, and the note was written confidently enough to be acted on. Grep
before believing a previous run's dead-code claim, including this one.

What that caller means is more interesting than the correction: `BugWhoAll` is
the **23rd chat parser**, missed by last run's sweep of the other six, and it
still carries the any-character offset-1 tolerance those six lost. Its shape is
also the `NotificationEventParser` shape — `(startsAt0 && endsWithTerminator)
|| startsAt1`, so a block that starts at offset 1 skips the terminator check
entirely, which is Raptor's operator precedence showing through again. Worth
reading `BugWhoAllEventParser.java` upstream before touching it; unlike the six,
this one has not been checked against Raptor.

**The two writers of remembered window positions now share one module.**
`packages/web/src/windows/windowPositionStore.ts` holds the storage key, the
`StoredPosition` shape, `WindowKind`, `loadPositions`/`savePositions` and the
`windowStorageKey` convention; `WindowManager` and `windowPosition.ts` both
import it and neither declares any of that any more. They agreed before — this
removes the way they could stop agreeing, which mattered because a divergence
is silent: a board writes under one key, reopens from another, and simply
forgets where it was.

Both writers stay, and the reason is in the new module's header rather than in
a comment on each side hoping the other is read: the manager's 1500ms poll is
what records a window the user moved and left open, and the popup's own
`pagehide` handler is what records a window being closed, which the poll cannot
see because the next tick finds `closed`. `savePosition(key, record)` is the
read-modify-write both now call, so neither can clobber the other's windows.

The 13 tests in `packages/web/src/windows/__tests__/windowPositionStore.test.ts`
are mostly ordinary round-trip and corrupt-storage cases; the four worth
keeping are the seam ones, which drive the real tracker and the real
`WindowManager` over one fake localStorage and assert a position written by one
is what the other acts on — for a board, for the chat singleton, and in both
directions. The first of them asserts *before* running the tracker's disposer,
because the disposer also writes and would otherwise cover for a `pagehide`
handler that had come unwired. Verified by sabotage: dropping the id from the
key reddens 24 across both files, making `savePosition` overwrite the map
instead of merging reddens 2, unwiring `pagehide` reddens 1.

`windowStorageKey` now takes `WindowKind` rather than `string`, so `WindowKind`
moved into the store module and `WindowManager` re-exports it. The `id` is
still `string | null | undefined`, and a falsy one still yields the bare kind —
unchanged behaviour, but it is now one line instead of two, and a test says
plainly what would happen if a board popup ever loaded without `?id=`.

**A remembered window position can no longer put a board somewhere the user
cannot look.** This was found while writing last run's `WindowManager` tests
and left unfixed then; it is fixed now. `featuresFor` used to hand
`window.open` whatever was in the saved record, so unplugging the monitor a
board was last used on — or reopening at a smaller resolution — sent
`left=2400` to a 1000px screen. The popup is not blocked, `open` returns a
handle, `isOpen` says true, and nothing is visible: the fourth way to get "no
board", and from the user's side identical to the other three.

`clampToScreen` now runs last in `featuresFor`, on whatever the feature string
is about to carry — saved record, cascade, or an explicit `spec.x`/`spec.y`.
Nothing routes around it, which is the point of putting it there rather than
in the saved branch.

The rule is deliberately asymmetric, and the asymmetry is the part worth
keeping:

- **Horizontally** a window may hang off either edge as long as 120px of it
  stays on screen. Overhang is an ordinary thing to have arranged on purpose,
  and a rule that forces the whole window into view moves windows nobody asked
  to move. Verified: forcing full containment reddens 13 tests, 4 of them
  pre-existing ones that assert a saved position is restored as saved.
- **Vertically** the top edge is never allowed above the available area at
  all. You drag a window by its top; one that starts above the screen cannot
  be brought back, whereas one hanging off the side still can.
- It clamps against `availableScreen()`, not `0,0` — `availLeft`/`availTop` is
  where a second monitor and a menu bar live, and clamping to the origin would
  drop a window onto the wrong display.
- **Size is untouched.** A window wider than the screen is awkward, not
  invisible, and shrinking a remembered size is a separate decision.

The clamp applies at open time and **does not rewrite the stored record** — the
1500ms poll overwrites it once the popup reports where it actually landed. So
`localStorage['raptor3000.windowPositions.v1']` can still read as off-screen
after a successful open, and that is not a symptom. A test pins it.

The 11 new tests are in the same file as the rest of `WindowManager`'s. All
four halves were checked to bite by sabotage: dropping the clamp reddens 9,
making the vertical rule symmetric reddens 2, clamping to `0,0` reddens 1,
full containment reddens 13.

**`WindowManager` is no longer untested.** It was the last React-free piece
with no coverage, and it sat directly under the still-open "why doesn't the
board appear" question: everything from the socket down to `GameManager.open`
was pinned, and then the URL, the window name, the feature string and the
position maths were not. The 46 tests in
`packages/web/src/windows/__tests__/windowManager.test.ts` cover them, 11 of
which are the clamp described above.

No jsdom was needed and none was added. What the class actually touches is
`window.open`, `window.screen`, `location.pathname`, `localStorage` and two
`setInterval` polls, so the test installs fakes for those five on `globalThis`
and drives the clock with vitest's. Assertions land on the three arguments
handed to `window.open` and on what appears in localStorage — the values a
browser acts on — rather than on internals, which is also why the private
`urlFor`/`featuresFor`/`defaultPosition` needed no extraction to be reachable.
Eight sabotages were checked to bite: renaming the `id` param, widening the
cascade wrap, letting `saved` beat an explicit `spec.x`, ignoring `saved`
entirely, dropping `availLeft`, dropping the `popup` flag, never clearing the
poll interval, and hardcoding `/` as the popup path.

The behaviours now pinned, several of which read as accidents until you look:

- The board URL param is **`id`**, not `game`. The file's own header comment
  said `?window=board&game=42`; `App.tsx:26` reads `id`. The comment was the
  wrong one, and correcting it was the only production line that run changed.
- A saved position **short-circuits before `cascadeIndex++`**, so a board with
  a remembered spot does not consume a cascade slot and the next new board
  still opens at the first offset. That is the desirable behaviour and it is
  incidental to `??`, so it is now held down.
- `spec.x`/`spec.y` beat a saved position, but **size still comes from the
  saved record** — a partial override moves the window without resizing it.
- The cascade wraps at 6 and applies only to windows carrying an `id`, so
  singletons (chat) reopen in place.
- A blocked open is tracked nowhere, so a retry is a real `window.open` rather
  than a `focus()` on a null. That is the `WindowManager` half of the contract
  `GameManager` relies on when it keeps a blocked game in `getOpenGameIds()`.

Both of the loose ends this file used to carry — the duplicated constants and
the `string | null` id — are folded into the store module described above.

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

- Engine, variants and Stockfish are unstarted.
- The e2e specs (`observe-bugs`, `two-guests-play`) need a live FICS connection
  and have not run since April.
- Dependencies are three months old; a cold `yarn dev` may want `yarn install`.

## The architecture, stated once (2026-08-12)

**Pub/sub, not event-service.** Parse the FICS byte stream once (the
parser taxonomy is the valuable part — a decade of protocol archaeology
in one place). Publish typed events on the two buses (ChatService,
GameService). Subscribers self-select — `accepts()` — and **keep their
own state**: the chat window folds its own log, the #39 tab means "I
accept channel-39 tells", each board window accumulates its own game.
No stores between the bus and the window. The `TabStoreRegistry` /
`ChatTabStore` layer was deleted this day with zero consumers — it was
Raptor-JVM parity, portability insurance for a second platform that
does not exist, and it sat on the wrong side of the popup reactivity
boundary besides.

**Code custom to the platform.** This is a web app; write it like one.
If a second platform ever matters, write a second small app against the
same protocol layer — `packages/shared` now has zero runtime
dependencies, which is what makes that cheap. App-local events (a
preference change, say) may ride the same buses as FICS events when a
second consumer needs them; until then, don't mint types.

## Next thing that would make sense

**The popup hypothesis is dead, killed with a browser (2026-08-12).** Board
popups open and paint in both Chrome and Brave: an examine board accepted a
drag, an observed live game rendered fully. The whole diagnostic ladder above
it (blocked windows, off-screen positions, BoardWindow's render) is settled —
the client plays. What remains, in rough order of value:

1. **Cross-tab session lock.** The one-session-per-account handling is
   surfaced and recoverable now, but two long-lived windows still fight
   politely. A BroadcastChannel lock — background documents don't
   auto-connect while another window holds the account, offer "take over"
   instead — finishes the job the 2026-08-12 login rewrite started.
2. **Analysis-not-updating** (Carson's 08-05 report). The static inspection
   chain in `queue/suggestions.md` cleared every link; this needs a live
   browser with a temporary log in `EngineManager.refresh()` — id, FEN,
   resulting depth — while an observed game plays.
3. **Wire the three unconsumed preferences**: ~~`moveListVisible`~~ (the
   per-mode layout memory consumes it as the observing/examining fallback,
   2026-08-12), `showEngineAnalysis` (EnginePanel gates on mode only),
   ~~`soundMode`~~ (consumed 2026-08-12: `sounds.ts` + the piano set.
   Licensing note for the attribution page: lichess's STANDARD sounds are
   in lila COPYING.md's "Exceptions (non-free)" — the free sets are
   futuristic/nes/piano/sfx, AGPLv3+ by Enigmahack; we ship piano).
4. **Day-mode chat palette.** Partially answered late on 2026-08-12: the
   per-type colours are preferences now (Options → Console), so Carson can
   fix any washed-out type himself. Still open: the STOCK palette's light-
   mode values — the Auto colours are dark-tuned. A theme-aware stock pair
   (like the board shadow token) is the finishing move.
5. **Ratings in the board info bands.** The bands show name + clock;
   FICS sends ratings in `<g1>` (`rt=1586E,2100`) and G1Message already
   parses. Chess Ascent shows a rating badge there; parity says we should.
5a. **Mobile, if it ever matters.** 2026-08-12: shipped the honest
   version — `mobile.ts` detection + a login-screen note that this is a
   windowed desktop app (Carson pre-approved the note path if a switcher
   wasn't cheap; it wasn't). The real fix, when wanted, is a
   single-window mode: a parallel WindowManager path that mounts
   BoardWindow/ChatWindow full-viewport in the MAIN document behind a
   bottom tab strip. In-document actually DISSOLVES the popup
   reactivity boundary (same window, MobX just works), but every popup
   assumption — watchForClose, positioning, beforeunload disconnect,
   window titles — needs gating. A day's careful work, not an evening's.
5b. **Move history is window-local — a decision, not a gap.** Carson,
   2026-08-12: no central per-game store. Each BoardWindow accumulates
   its own SAN list from `gameStateChanged` (local React state, exactly
   the ChatWindow pattern), and seeds mid-game joins by sending `moves`
   on mount — `MovesParser` already handles the reply. Rationale: MobX
   observables from the main window are not reactive in popups (the
   documented ChatWindow constraint), so a central store sits on the
   wrong side of the boundary for every consumer; window-local state
   also gets lifecycle for free. Close-and-reopen re-seeds itself. This
   is what unblocks the move-list panel (item 3's `moveListVisible`),
   the examine-mode nav arrows, and eventually PGN export. The old
   README item "Per-gameId GameStore + GameRegistry" is overtaken —
   GameService's maps already went per-id, and the rest of that plan
   should not be built.
6. **Toolbar wiring**, one button at a time — `boardToolbar.ts` is data,
   flip `implemented` per button as each handler lands. Done late
   2026-08-12: the nav arrows (server-side in EXAMINING, local history
   browse elsewhere) and Flip. Still dead: Resign/Draw/Abort/Adjourn and
   the castle shortcuts (one-line sends), Update/Winners, the SETUP set,
   Rematch/Save PGN (PGN needs the move list → chessops export).
7. **Parked, deliberately**: SAN in the engine PV and legal-move dots — both
   blocked on a client-side move generator (the ChessAPI port). Approximating
   either is wrong exactly where it matters.

Also standing: FICS-side channel join. `autoJoinChannels` drives the chat
backfill (2026-08-12) but nothing sends `+channel N` at login — the account's
own FICS-side channel list is doing the joining today, which works for cday
and silently does nothing for a fresh account or a guest.

**Raptor's source is no longer at `/tmp/raptor`.** Comment headers all over
this codebase cite paths like
`/tmp/raptor/raptor/src/raptor/connector/ics/chat/ChatEventParser.java`, and
that tree is gone — those are historical citations, not something to open.
Upstream is readable at
`raw.githubusercontent.com/fbergo/Raptor/master/raptor/src/raptor/...`, which
is where `TellEventParser.java` was checked on 2026-08-04, and
`FingerEventParser.java`, `ToldEventParser.java` and
`NotificationEventParser.java` on 2026-08-09, rather than trusting a previous
run's note. Those notes were right, but the layer mistake of 2026-08-01 is
cheap to repeat and cheaper to avoid — and the Finger one was decisive:
"does Raptor trim before this check" was the whole question, and the answer
(no) is not something the port's own comments recorded.

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

Offline work that remains available, in rough order of what a night can
finish: `BugWhoAllEventParser`'s offset-1 tolerance and terminator precedence,
described above, which is the tail of the 2026-08-09 prefix work and wants an
upstream read first; the two TS6133 errors in `EngineManager.test.ts`, whose
removal is what would let `npx tsc --noEmit` in `packages/web` be used as a
gate; and — larger, and a design call rather than a mechanical one — the
semantic colours the theme-var pass deliberately left alone, of which
`colorFor`'s chat greens and ambers are the ones a user meets. A true
`BoardWindow` render test *would* need jsdom + testing-library added to the
lockfile — a daytime decision, not a nightly one, and it is now what stands
between the toolbar tests and proof that a `disabled` button reaches the
screen.

The React-free-with-no-tests list is empty as of 2026-08-09. What has no coverage
now is React components and the two Playwright e2e specs, which is a different
kind of gap and not one a night without a browser closes.

Note the web suite is outside `bin/raptor-run.sh`'s ratchet, which counts only
`packages/shared`. Tests added there are real but unguarded: nothing reverts a
run that deletes them — and eight of the last ten nights landed their
increment there (34 → 144 web tests since 2026-08-05) while the ratcheted count
moved twice, 289 → 306 → 315. Both of those moves were `packages/shared` work
that surfaced from reading `packages/web`, which is where the remaining offline
work still mostly lives. Pointing the ratchet at both packages is a one-line change to
`count_tests` in `bin/raptor-run.sh` and would be worth Carson making.
`count_skips` does scan `packages/*/src`, so silencing a test is still caught
either way.

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
