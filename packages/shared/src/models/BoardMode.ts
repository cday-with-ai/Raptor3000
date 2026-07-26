/**
 * Board-window mode. Parity with Raptor's ChessBoardController hierarchy
 * — one value per controller. Mode is derived from server state (Style12
 * relation + game-state flags), not chosen by the user.
 *
 * Toolbar and interaction rules vary by mode (see MEMORY /board_modes).
 * Summary:
 *   PLAYING           — user is in the game; full play toolbar (Resign,
 *                       Draw, Abort, Adjourn, O-O, O-O-O, auto-promote).
 *                       Engine analysis HIDDEN (anti-cheating).
 *   OBSERVING         — watching a live game; nav + UPDATE + engine.
 *   EXAMINING         — reviewing with free navigation; setup, variations.
 *   SETUP             — placing pieces in bsetup; Clear/Done/FromFEN/Start.
 *   INACTIVE          — game ended; post-mortem review, rematch, Save PGN.
 *   BUGHOUSE_SUGGEST  — partner's bughouse board; suggest moves only.
 */
export const BoardMode = {
  PLAYING: 'playing',
  OBSERVING: 'observing',
  EXAMINING: 'examining',
  SETUP: 'setup',
  INACTIVE: 'inactive',
  BUGHOUSE_SUGGEST: 'bughouseSuggest',
} as const;
export type BoardModeCode = (typeof BoardMode)[keyof typeof BoardMode];

/** Modes in which Stockfish engine analysis is allowed. Never PLAYING. */
export function engineAnalysisAllowed(mode: BoardModeCode): boolean {
  return (
    mode === BoardMode.OBSERVING ||
    mode === BoardMode.EXAMINING ||
    mode === BoardMode.INACTIVE
  );
}

/**
 * Style12 relation → board mode (first-pass, ignoring setup/bughouse).
 * Mirrors the `if` ladder in Raptor's `IcsUtils.buildController` with
 * game-state flags projected onto the relation codes:
 *
 *   relation -3 (isolated)        → INACTIVE
 *   relation -2 (obs examined)    → OBSERVING
 *   relation -1 (playing, opp)    → PLAYING
 *   relation  0 (obs live)        → OBSERVING
 *   relation  1 (playing, me)     → PLAYING
 *   relation  2 (examining)       → EXAMINING
 *
 * SETUP and BUGHOUSE_SUGGEST aren't reachable from relation alone —
 * those are promoted by out-of-band signals (Entering setup mode.,
 * bughouse partner-board heuristics) and should be set by the caller.
 */
export function modeFromRelation(relation: number): BoardModeCode {
  switch (relation) {
    case -1:
    case 1:
      return BoardMode.PLAYING;
    case 2:
      return BoardMode.EXAMINING;
    case -2:
    case 0:
      return BoardMode.OBSERVING;
    case -3:
    default:
      return BoardMode.INACTIVE;
  }
}
