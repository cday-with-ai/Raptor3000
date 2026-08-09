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
