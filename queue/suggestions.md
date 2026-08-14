# Suggestions

Type anything here. Raptor3000 reads this file on its next run, does what it
reasonably can, and writes back underneath your note. It never deletes what you
wrote.

There is no format. "check whether my nvme is throwing errors", "stop telling me
about steam ports", "the evidence section is too long" all work fine.

This is the only inbound channel, and it is deliberately one-way in the useful
direction: you write when you feel like it, Raptor3000 answers on its own
schedule. Nothing here is a queue and nothing is waiting on you — an empty file
is the normal state.

---

## 2026-07-26 — Carson

(nothing yet)

---

## 2026-08-05 — Carson

Don't start tells with `tell 39` when I'm already in the channel 39 tab. If the
tab is channel N and what I typed already begins with `tell N`, strip that off
rather than sending it — I shouldn't end up with `tell 39 tell 39 ...` because I
typed the command out of habit.

Likely spot: `TabPrefix.channel` in `packages/shared/src/stores/TabPrefix.ts`
unconditionally prepends `tell ${n} `. Same reasoning presumably applies to the
person tabs (`tell <name>`) and `ptell` for partner, but 39 is the one that bit
him.

Changing the piece set doesn't repaint the whole board. Filed first as a
re-render bug — that guess was wrong, and the real finding is bigger:
`loadPreferences()` is called in exactly one place, `MainWindow.tsx:221`, inside
`OptionsPage`. Nothing else in the app reads it. So `pieceSet`, `boardTheme`,
`boardCoordinates`, `moveListVisible`, `soundMode`, `showEngineAnalysis` and
`autoJoinChannels` are all written to localStorage correctly and consumed by
nobody — the Options page is a form that talks only to itself. The board renders
its Unicode first-pass glyphs no matter what's selected.

Carson also asked that settings changes be remembered for next time. The
round-trip in `preferences.ts` is already correct — `savePreferences` fires on
every edit (`MainWindow.tsx:226`) and `loadPreferences` reads every field back
symmetrically with validated fallbacks, so nothing is being lost across
sessions. The reason it doesn't *feel* remembered is the paragraph above: the
value survives and then changes nothing. Wiring consumption is the fix; the
persistence layer needs no work.

And he'd like the set lichess ships as its default — that's cburnett (the GPL
SVG set) — as Raptor3000's default too. Worth confirming the name against
lichess's own assets rather than taking this note's word for it.

The buttons don't work well when observing. Checked the code before filing this:
`TbButton` in `packages/web/src/windows/BoardWindow.tsx:844` takes only
`children` — no `onClick` prop exists, and the rendered `<button>` has no
handler. So every toolbar button is decorative in every mode, including the
OBSERVING pair (`Update`, `Winners`) and the ⏮ ◀ ▶ ⏭ nav buttons. They also
carry `cursor: 'pointer'`, so they advertise themselves as working.

Whatever the fix order is, the honest interim would be disabling or dimming the
ones with nothing behind them — a button that looks live and does nothing reads
as a broken app rather than an unfinished one.

(If what Carson meant was a button that *starts* an observe rather than the
board toolbar, that's a separate thing and the above is a real bug found on the
way.)

The help page can't be scrolled — content past the viewport is unreachable.
`index.css:46` sets `html, body, #root { height: 100%; overflow: hidden }`,
which is the right call for an app shell but means every scrollable region has
to declare itself. `helpContainer` (`MainWindow.tsx:599`) is `flex: 1` with no
`overflow`, so the overflow is simply clipped. Two things to get right together:
the container needs `overflow: 'auto'` *and* `minHeight: 0`, since a flex child
won't shrink below its content height without it — setting only the first is the
usual reason this fix appears not to work. `pageShell` is `minHeight: '100vh'`,
which should probably be `height: '100vh'` so the column has a bounded height to
divide. `optionsGrid` (`MainWindow.tsx:661`) has the identical shape and is
presumably the same bug on the Options tab.

Theme changes don't reach popups that are already open. `applyTheme`
(`theme.ts:45`) writes `document.documentElement.dataset.theme` on whichever
document called it, and board/chat windows are real `window.open` popups
(`WindowManager.ts:111`) with their own documents. They pick up the theme
correctly at open time via `main.tsx:8`, then never hear about a change. Same
for System specifically: `watchSystemTheme` is subscribed only in MainWindow
(`MainWindow.tsx:104`) and its callback re-applies to the main document only, so
an OS light/dark flip leaves open popups stale until they're reloaded.

Cross-window `storage` events look like the fix that fits the existing design —
same-origin windows already share the localStorage the mode is persisted in, so
each document can subscribe and re-apply for itself, and each popup can run its
own `watchSystemTheme` while mode is `system`. That keeps it deterministic and
avoids the main window having to hold a registry of popup handles and push to
them.

Engine analysis should display short algebraic, not coordinate notation. The PV
is stored raw from UCI today — `EngineAnalysis.pv` is documented as
`"e2e4 e7e5 ..."` (`EngineService.ts:28`) and rendered as-is. Note this probably
blocks on something unbuilt: correct SAN needs legal-move generation to
disambiguate (`Nbd2`, `exd5`, `O-O`, promotions, `+`/`#`), and there's no chess
rules library in the dependencies — `packages/web/package.json` carries only
`stockfish`, and the ChessAPI port is still open in the README. Converting with
a from/to-square heuristic instead would be wrong in exactly the positions where
notation matters most, so this may be worth parking behind the move generator
rather than approximating.

Two more from live use, both real symptoms I could not localize by reading:
engine analysis doesn't update as moves are played, and the position doesn't
look quite synchronized.

To save the next run the same walk, here is what is *not* wrong — every link in
the update chain checks out on inspection:

- `FicsParser.ts:342,349` calls `recordStyle12` then `fireGameStateChanged` on
  every Style12, so the events do fire per move.
- `GameService.fireGameStateChanged:267` fans out to all listeners.
- `EngineManager`'s listener handles `gameStateChanged` by re-analyzing when the
  id matches the focused game (`EngineManager.ts:48-51`).
- `EngineService.analyze:76` sends `stop` before `position fen` / `go`, so it's
  not the classic UCI bug of a stale search swallowing the new position.
- Popups aren't a second instance: `App.tsx:27-31` only builds a context on the
  main window, and `getContext` walks to `window.opener.raptor` otherwise, so a
  board popup shares the one GameService and EngineManager.
- `style12ToFen` (`chessAlg.ts:83`) looked correct on turn, castling, and en
  passant rank. One thing to fix while in there regardless: the comment at
  `chessAlg.ts:122` describes the `'3'` branch but sits above the line that
  returns `'6'` first, which reads as a bug and isn't one.

So it likely needs watching live rather than reading — the suspects left are
timing/identity ones that don't show up statically: whether `focusedGameId` is
still set at the moment the moves arrive, whether the focused id matches the id
on the incoming Style12, and whether the popup's `onAnalysis` subscription
(`BoardWindow.tsx:633`) survives re-render. Worth adding a temporary log at
`refresh()` of the id, the FEN, and the resulting depth, and playing through an
observed game.

Carson also said to pass on: good job, keep going, he's impressed with the
progress.

**Raptor3000:** 2026-08-09 — The `tell 39 tell 39` one is fixed. Everything
else here is read and triaged below, untouched; one item per night.

The fix is a new `applyTabPrefix(prefix, input)` in
`packages/shared/src/stores/TabPrefix.ts`. If what you typed already opens with
this tab's own command and target, that counts as the prefix instead of as
message text. It covers the person tabs and `ptell` as you guessed, and
`xwhisper` for game chat, since they all go through the one function.

Two places were prepending, not one. `ChatTabStore.sendInput` is the shared
one, but the chat popup you actually type into had its own copy at
`ChatWindow.tsx:66` — fixing only the store would have changed nothing you
could see. Both now call the shared function. 22 tests cover it.

Three judgement calls in there, all deliberate:

- It strips **one** occurrence. In an alice tab, `tell alice tell alice about
  the bug` keeps the second one, because that is the sentence alice is meant to
  read.
- It matches **this tab's target only**. Type `tell 40 hi` in the 39 tab and
  you still get `tell 39 tell 40 hi` — a line FICS will reject visibly. The
  wider rule, suppressing any leading command, means a tab quietly sends
  somewhere else *and* the tab's own echo filter drops it, so the line
  disappears from the transcript with no error. If you want that behaviour
  anyway, say so; the seam is one function.
- Abbreviations are not matched. `t 39 hi` still doubles. FICS accepts `t` for
  `tell`, but the abbreviation table isn't in this codebase and guessing at it
  is how a prefix filter starts eating real messages.

One accident of the fix worth knowing: `TELL   39   hi` now sends as
`tell 39 hi`. The prefix is re-emitted canonically, so spacing you typed
between the command and the target is normalised. Nothing after the target is
touched.

On the rest — your own notes here did most of the diagnostic work, and they
hold up on re-reading. Rough order of what they imply, for whoever picks the
next one:

- **The Options page talking only to itself** is the biggest of these by some
  distance. It makes seven settings look broken at once, and the piece set and
  theme complaints are both downstream of it. Not a nightly-sized job: it needs
  a consumer wired into the board renderer, and confirming that is real needs a
  browser.
- **cburnett** is right — it's lichess's default and it's GPL. That does mean
  Raptor3000 taking on GPL-licensed assets, which is your call, not mine.
- **The dead toolbar buttons** and **the two unscrollable panes** are both
  offline-doable, small, and self-contained. The scroll one is a good next
  nightly: your `overflow: 'auto'` *plus* `minHeight: 0` note is the actual
  trap, and it applies to the Options grid identically.
- **Theme not reaching open popups** — the `storage`-event design you sketched
  is the right shape, and testable without a DOM at the subscribe/re-apply
  boundary.
- **SAN in the engine PV**: agreed, park it. Disambiguation needs legal-move
  generation, the ChessAPI port is unstarted, and a from/to heuristic is wrong
  exactly where notation earns its keep.
- **Analysis not updating / position out of sync**: your inspection chain is
  right and I have nothing to add statically. This is the one that genuinely
  needs you at a browser with a log at `refresh()`.
- The stale comment at `chessAlg.ts:122` is still there — it's a one-line
  fix but it isn't tonight's, and swept-up extras are how an increment stops
  being reviewable.

**Raptor3000:** 2026-08-09 (second run) — The Help page scrolls now, and so do
Options and Seek.

Your `overflow: 'auto'` *plus* `minHeight: 0` note was right and was the trap.
There was a third piece you didn't have: `pageShell` was `minHeight: '100vh'`,
and a min-height column just grows with its content, so the pane is never
squeezed and the overflow never triggers no matter what you set on it. It's
`height: '100vh'` now, with the header and footer `flexShrink: 0` so they don't
absorb the squeeze instead.

The three panes now share a `scrollPane` base in a new
`packages/web/src/windows/shellStyles.ts` rather than each declaring `flex: 1`
inline. That was mostly so there'd be somewhere for a test to stand: 12 tests
walk that module's exports and fail on any pane that grows without both
properties, so a pane added there next month is covered without anyone
remembering. Confirmed it bites by deleting `minHeight` and watching it go red.

I did Seek as well as the two you named — same shape, same shell, third copy of
it. Its placeholder panel still hardcodes `#1b1f26`/`#2a313c` instead of the
theme vars, so it will stay dark in day mode; that's a different bug and I left
it.

One caveat: these tests assert what the shell hands React, not layout the
browser computed. Nothing offline can watch a pane actually scroll. If Help
still clips when you next open it, the fix is wrong rather than unproven, and
worth telling me.

**Raptor3000:** 2026-08-09 (third run) — Theme changes should now reach popups
that are already open, including an OS flip while you're on System.

Your `storage`-event sketch was the right shape and is what I built. Each
document installs its own sync — `installThemeSync` in `theme.ts`, called once
from `main.tsx`, which every window runs because they all load the same bundle.
It applies the stored mode at boot, then re-applies whenever the theme key
changes in localStorage or the OS flips. No registry of popup handles, no
window needing to know the others exist.

Two bits of it look redundant and aren't, so they're worth knowing before
someone tidies them:

- The main window still applies the theme itself. A `storage` event doesn't
  fire in the window that *wrote* the value, only in the others. So the sync
  carries your change to the popups but can't see it in the window you made it
  in. Delete that line and the only window that stops working is the one with
  the toggle in it.
- The OS-flip listener isn't gated on the mode being System. It's cheap to
  re-apply an explicit Light or Dark, and a gated listener would have to be
  rebuilt every time the mode changed to notice you'd switched to System in a
  different window.

11 tests, in `packages/web/src/__tests__/themeSync.test.ts`. They run without a
DOM because the sync takes its environment as an argument — read the mode,
resolve it, paint it, subscribe — so a test can hand it fakes. One of them runs
two syncs over two fake documents and fires a single event, which is the
arrangement your popups actually rely on. I checked both halves bite by
breaking them on purpose: dropping the storage handler fails 5, gating the OS
listener fails 2.

Same caveat as last night, and it matters more here: nothing offline can prove
a real `storage` event crosses a real `window.open` boundary. The contract is
standard and same-origin, so I expect it works, but the thing to try is opening
a board, then flipping Day/Night in the main window — the board should follow
without a reload. If it doesn't, tell me and I'll look at whether the popup's
`main.tsx` is running at all rather than at the sync.

One side effect you might notice: the Seek panel still hardcodes `#1b1f26` /
`#2a313c` instead of the theme vars, so it stays dark in Day mode. It did
before too — the sync doesn't make that worse, but now that everything else
follows the theme properly it'll stand out more.

Next offline-sized one from your list is the dead toolbar buttons, unless you'd
rather have something else.

**Raptor3000:** 2026-08-09 (fourth run) — The dead toolbar buttons now look
dead. This is the interim you named, not a fix: all 20 of them are still
unwired, but they render greyed out and disabled, with a `not-allowed` cursor
and a tooltip saying `Resign — not implemented yet`. Nothing on the board
toolbar claims to work any more.

You were right about `TbButton` — no `onClick` prop existed and every mode's
buttons went through it, so this was one component to change rather than
twenty. I moved the buttons out of the JSX into
`packages/web/src/windows/boardToolbar.ts` as plain data: each is
`{id, label, implemented}`, and `implemented: false` is what makes it render
disabled. Wiring one becomes a two-line change in one place, and flipping the
flag without adding a handler puts back exactly the bug you reported.

Doing it as data was mostly so it could be tested without a browser: 14 tests
assert which buttons each mode gets and that a dead one never carries
`cursor: 'pointer'`. They test the dimming rule on made-up items rather than
the real ones, so the night someone wires Resign they don't have to edit tests
that aren't wrong. Checked both halves bite by breaking them: pointing the
cursor again fails 2, letting the engine toggle show while you're playing
fails 2.

The one thing offline tests can't confirm is that `disabled` reaches the actual
DOM — that needs jsdom in the lockfile, which felt like your call rather than a
2am one. If you open a board and the buttons still look clickable, that's the
render, not the rule.

That's the last item from your note that fits a night. What's left of it is the
Options page reading its own settings (needs a consumer in the board renderer
and a browser to confirm), and the analysis-not-updating one, which still needs
you at a browser with a log in `refresh()`. Offline, the next thing I'd pick up
unprompted is `WindowManager` — the last piece with no tests at all, and the
one place a blocked or mispositioned board window could still be hiding.

**Raptor3000:** 2026-08-09 (sixth run) — Day mode was broken in a way I'd only
half-reported to you, and it's fixed now.

Three runs ago I got theme changes reaching your open popups, and that part
does work. What I didn't check was whether the windows had anything to repaint.
About thirty inline styles were hex literals copied out of the *dark* palette
rather than reading it: every divider line, every button and input outline, the
chat tab underline, your own outbound messages, and the whole-window background
of the board layout and of the error screens. So switching to Day gave you a
white page with dark borders and dark panels sitting on it. I'd told you about
exactly one instance of this — the Seek panel — as a leftover; it was actually
the whole UI, and the Seek panel was just where I happened to notice it.

They all read the palette now. One new var, `--border-strong`, because the app
was already using three border weights and only had names for two.

What I did **not** convert, and you may still notice: colours that aren't in
the palette at all. The board squares (those already have their own light/dark
pair and are fine), the clock's green and red, the login error red, and the
per-type chat colours — the green for tells, the amber for channels. Those last
ones were picked for a dark background and will look washed out on white. Fixing
them means choosing new colours rather than swapping in existing ones, which
felt like your call and not a 2am one. Say the word and I'll pick a light-mode
set.

The guard against this happening again is a test that reads `index.css` as the
truth about what the palette is and fails on any source file that hardcodes one
of those values, naming the var it should have used. That also catches the
nastier version: a var declared in the dark block and forgotten in the light one
still *resolves* in Day mode — it just quietly keeps its dark value, with no
error anywhere. 26 tests. I broke each half on purpose to check they bite.

Usual caveat, and it's the same one as the theme sync: nothing offline can look
at a rendered page. If a surface is still dark in Day mode after this, it'll be
one of the semantic colours above rather than a missed literal — there are none
of those left, and the test won't let one back in.

**Raptor3000:** 2026-08-09 (seventh run) — Two things from your note, one of
them bigger than it was filed as.

The small one first: the misleading comment at `chessAlg.ts:122` is gone. You
were right that it wasn't a bug, and it now describes both branches in the
order they actually appear.

The bigger one came out of reading the same function. **When black castled, the
board highlighted white's back rank.** FICS writes the castling move as bare
`o-o` with no colour and no rank in it, and our parser resolved that to e1→g1
every time regardless of who moved — so a black castle lit up e1 and g1, where
in most positions the white king is still sitting, and left the king that
actually moved unmarked two ranks away. Every castle by either side has done
this since the highlight was written.

The parser now takes the mover's colour, and it's a required argument rather
than one with a default, because a default here is a wrong answer half the time
instead of a visibly missing one. There's a second function, `lastMoveSquares`,
that works the colour out from the Style12 for you — the flag FICS sends is the
turn *after* the move, so the side that moved is the other one, and that
inversion is now written down once instead of at each call site.

I want to be careful about what this does and doesn't explain, because it's
adjacent to your "the position doesn't look quite synchronized" report. This is
a *highlight* bug, not a position bug — the pieces were always drawn from the
grid FICS sends and were correct. If what you saw was two squares glowing in
the wrong place after a castle, that's this and it's fixed. If it was pieces in
the wrong places, it isn't this, and that one still needs you at a browser.

9 tests. The one I'd point at feeds a recorded `<12>` for a position where
black has castled and white hasn't through the whole connector chain, then
asserts that the piece standing on the square about to be highlighted *is* the
king that moved — so the highlight and the position have to agree, rather than
both being checked separately against my own arithmetic. Checked it bites by
breaking each half on purpose.

Worth knowing: upstream Raptor never parses that field at all — it works from
the SAN and its own move generator. So this is our code with no upstream to
compare against, and if the ChessAPI port ever lands it's a candidate for
deletion rather than repair.

## 2026-08-09 — Carson

the background color for active clock looks like crap i think the text should be white on the dark green possibly.

## 2026-08-09 — Carson

the background color for active clock looks like crap i think the text should be white on the dark green possibly.

## 2026-08-09 — Carson

the interface we are using for chessascent is really nice — the coordinates and labels are even in good positions. possible to clone it for the board on fics? a lot of time was put into that design.

## 2026-08-09 — Carson

more on that: the shadows, the piece set, the fonts, the font sizes — everything about the chessascent board is nice. it's the whole treatment, not one detail.

## 2026-08-09 — Carson

and the word for what makes it work: minimalist and clean. that's the target, not just copying the assets across.

**Raptor3000:** 2026-08-12 (live session with Carson) — All five notes above
are done, plus the biggest item from the 08-05 triage. Landed today, in
commits `cd2a388` through `d70420c`:

- **The clock**: white text on the ticking chips (your note, filed twice —
  heard both times), and then the whole chip palette became preferences:
  Options → Clock colors, background + text per state (active / low on
  time / idle), Auto as the default meaning the stock look.
- **The chessascent board treatment, whole**: color themes to the hex
  (brown default) plus the custom picker, the five piece SVG sets
  (cburnett default, per your 08-05 note — confirmed it is lichess's
  default), the 4px rounding and light-mode shadow, the in-square
  coordinates, the board-width info bands with their 4px/12px spacing,
  the measured perfect-square sizing, and a pointer-events port of the
  drag-and-drop (10px tap threshold, works on touch). Verified against
  live FICS: a synthetic drag e2→e4 round-tripped as `P/e2-e4`, and an
  observed game's DOM asserted the exact hexes, radius, shadow and SVGs.
- **The Options page no longer talks only to itself** — the board and
  clock consume preferences live via storage events, which closes the
  root cause under the 08-05 piece-set and theme complaints. Still
  unconsumed: `moveListVisible`, `soundMode`, `showEngineAnalysis`.
- Also new since your notes: login is confirmed-not-assumed with the
  account kick-war handled and surfaced (that was the "won't connect"
  of this morning), a Reconnect button, an auto-login toggle in Options,
  reset-to-defaults, hex fields on every color control, and 24h channel
  backfill in the chat window from the chessascent channel-log API —
  scroll up in #39 to before you logged in.

Still open from the 08-05 triage, untouched tonight: analysis-not-updating
(needs a live browser with a log in `refresh()`), SAN in the engine PV
(parked behind a move generator, same as legal-move dots), the day-mode
chat palette (tell/channel greens and ambers picked for dark), and wiring
the three unconsumed preferences above. PLAN.md's "Next thing" section is
rewritten tonight to match.

## 2026-08-13 — Carson

Login hiccup, diagnosed in a session tonight — the fix is designed, needs building.

Symptom: first login prompt bounces with "Sorry, names can only consist of lower
and upper case letters", second prompt accepts the handle. Looks like the
username is sent twice, once corrupted. It isn't. The bad line is '=censor':
ChatWindow's censor-list seeding (ChatWindow.tsx ~line 111) fires
sendMessageHidden('=censor') on mount, and the chat window is opened via
setTimeout(0) in the same effect that starts the login (MainWindow.tsx:66) — so
it mounts mid-login. sendMessageHidden gates on this.connected, which is true
from WebSocket OPEN (FicsConnector.ts:143), not from auth. The '=' is a
non-letter, FICS's login reader eats it, and the state machine's one legitimate
handle lands on the second prompt.

Ruled out already, to save the walk: the Timeseal2 opener is innocent (probed
wss 5001 sending only the opener and no handle — one clean login: prompt, no
rejection), and the login state machine can't double-send (loginStage guard).

Side effects of the same bug: the censor seeding itself is broken — its reply
was that Sorry line, so the collector never got the list. And the race runs the
other way too: mount before socket-open and sendMessageHidden returns false, the
seed silently dropped.

The fix, connector-level so no future call site reintroduces it (same
philosophy as the prepareOutbound choke point):
1. sendMessageHidden: socket up but loginStage !== 'authed' -> push onto a
   preAuthQueue, return true.
2. onLoggedIn(): after the login script runs, flush the queue in order.
   (Stage is already 'authed' when onLoggedIn fires, so the script is safe.)
3. Clear the queue in onclose and disconnect() — a command queued during a
   failed login must not fire into a later session.
4. Leave sendMessage (user-typed) untouched: typing at the login: prompt is the
   documented log-in-by-hand fallback and must keep reaching the server raw.
Rule being encoded: humans may talk to the login prompt; robots wait for auth.
Plus a loginFlow test pinning "hidden send during login stays out of the login
buffer". Follow-up worth doing while in there: ChatWindow re-seeds '=censor' on
the logged-in signal rather than on mount, which closes the mount-before-open
drop as well.

Cosmetic, separate: the ?? pairs after login: and password: are FICS's telnet
echo negotiation (FF FB 01 / FF FC 01) coming through TextDecoder as U+FFFD.
Stripping /��\x01/g in handleRaw's normalization would clean the
console.

## 2026-08-13 — Carson

Strange disconnects on raptor3000.pages.dev — diagnosed in a session, most
likely FICS's 60-minute idle auto-logout, plus two aggravators. Evidence and
fixes below; the deployed bundle was checked and is current (has keep-alive,
kick handling, censor seed).

Why it reads as strange: nothing surfaces the reason. FICS prints
"**** Auto-logout because you were idle more than 60 minutes. ****" as ordinary
text (nothing in the codebase matches Auto-logout — checked), then closes the
socket, and the console's INTERNAL line says only "WebSocket closed" without
even the close code. The farewell scrolls away and the disconnect looks
causeless.

Why it bites on pages.dev specifically: keepAlive defaults to 'off' and
preferences are per-origin localStorage — settings flipped on localhost do not
exist on raptor3000.pages.dev. Watching channel 39 without typing counts as
idle to FICS (incoming traffic does not reset idleness), so a lurking session
dies on the hour, every time.

Aggravator 1: even with keep-alive on, 59 minutes against a 60-minute limit is
razor thin, and the interval lives in PostLoginShell — the MAIN window, which
sits backgrounded while play happens in the popups. Chrome throttles timers in
backgrounded tabs (minute-aligned under intensive throttling), so the tick can
land late and lose the race. 20-25 minutes keeps the same effect with margin.

Aggravator 2 (the wildcard): the WebSocket lives in the main window; popups
reach it via window.opener. Chrome's Memory Saver discards backgrounded tabs —
a discarded main window kills the connection outright and orphans every popup,
with no farewell at all. Worth an exemption note in Help, or checking
chrome://discards after an unexplained drop.

Fixes that follow, smallest first:
1. Surface the auto-logout farewell exactly the way kicks are surfaced
   (INTERNAL notice: "FICS logged this session out for idleness — keep-alive
   is off; turn it on in Options"). Pattern: /Auto-logout because you were
   idle/.
2. Include ev.code in the "WebSocket closed" INTERNAL message — 1006 vs 1000
   distinguishes a killed transport from a server goodbye, and costs one
   template slot.
3. Change the keep-alive interval to ~20-25 min. Consider defaulting the
   toggle ON with the 'date' command — a chess client that silently dies at
   the hour mark is the wrong default for a lurker's client.
4. Longer game: the cross-tab lock from the triage list is adjacent — with
   auto-login, a second tab kicks the first and the combination turns one
   stray middle-click into a "strange disconnect" too.

How to tell which one hit, next time it happens: scroll the console before
reconnecting. Auto-logout line = idleness. "you can't both be logged in" = a
second session. Nothing at all and dead popups = the tab was discarded.

## 2026-08-14 12:15 — Carson via second session

On disconnect, just a relaunch button — not a chat-window reopen / connection-reconnect flow. No label above it; the button itself, with the verbiage below it. Carson, relayed from the second build session 2026-08-14: 'ok just a relaunch button is what is needed not a chat window reopen/connection reconnect… it doesnt even need a lable above it just relaunch button with the verbage below it'
