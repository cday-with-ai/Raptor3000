# PLAN — FICS boards actually working

Written 2026-07-26 from a live session against freechess.org.

## Where this is

The connector, the parser and the board renderer all exist and are wired
together. 111 unit tests pass. What has never been demonstrated is a live
Style 12 line arriving from the server and painting a board — every test stops
short of that seam, which is why "boards don't work" and "everything is
implemented" were both true at once.

Four bugs were fixed today, all found by reading raw server output rather than
code:

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
for the blocked-popup icon in the address bar.

- If blocked: allow popups for `localhost:5173` and the board should paint. The
  real fix is surfacing `onBoardWindowBlocked` in the UI so it never fails
  silently again.
- If not blocked and still no board: the fault is downstream of the parser, and
  the login sequence, the transport and Style 12 parsing have all been
  eliminated — which is most of the surface.

After that, in rough order: check `set height 240` was accepted; treat
`Cannot alter:` and `Bad value given for variable` as errors during bootstrap
rather than chat (ten lines, would have caught two of today's bugs on the first
connect instead of three months later); then drag and drop.

## Notes for whoever picks this up

The server tells you things and nothing listens. Both login bugs today were
reported by FICS in plain English during bootstrap and filed as ordinary chat.
When something here doesn't work, read the raw stream before reading the code.
