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
