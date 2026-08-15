/**
 * The board window's toolbar, as data.
 *
 * Every button in every mode is currently decorative: `TbButton` rendered a
 * plain `<button>` with no handler while carrying `cursor: 'pointer'`, so the
 * toolbar advertised six working controls in PLAYING mode and delivered none.
 * A control that looks live and does nothing reads as a broken app rather than
 * an unfinished one, which is the complaint this module answers: an item
 * declares whether anything is wired behind it, and the ones that aren't are
 * rendered disabled and dimmed with a hint saying so.
 *
 * `implemented` is a claim about a handler existing, and it is nobody's job to
 * keep it honest but the commit that wires the button — set it to true in the
 * same change that gives the button something to do, never before. The rule it
 * feeds is in `toolbarButtonProps`, and `__tests__/boardToolbar.test.ts` pins
 * both branches of that rule rather than the current all-false state, so the
 * test survives the first button being wired instead of having to be edited
 * around it.
 *
 * The layout lives here rather than inline in `BoardWindow.tsx` so that the
 * mode → buttons mapping can be asserted without a DOM. What a test here
 * cannot see is the rendering itself; that still needs jsdom.
 */
import { BoardMode, type BoardModeCode } from '@raptor3000/shared';
import { AUTO_PROMOTE_PIECES, type AutoPromote } from '../preferences.js';

export type ToolbarItem = {
  /** Stable id, for tests and for handler lookup once handlers exist. */
  id: string;
  label: string;
  /** True only when a handler is actually wired behind this button. */
  implemented: boolean;
};

/**
 * A toolbar row: `left` and `right` with a flexible gap between them.
 * Most modes put navigation on the left; SETUP replaces it entirely.
 *
 * `autoPromote` and `autoDraw` are not buttons, which is why they are
 * flags rather than items: one is a row of checkboxes with its own rule
 * (see `nextAutoPromote`) and a persisted piece, the other is a toggle
 * that is armed or not. They ride here anyway so that "which modes show
 * them" stays one testable mapping instead of conditions spelled out in
 * the JSX. Two flags rather than one "automation" flag because they are
 * separate controls that happen to agree today, and a shared flag would
 * quietly decide they must always agree.
 */
export type ToolbarLayout = {
  left: ToolbarItem[];
  right: ToolbarItem[];
  autoPromote: boolean;
  autoDraw: boolean;
};

/** Hover text for a button with nothing behind it yet. */
export const NOT_IMPLEMENTED_HINT = 'not implemented yet';

function dead(id: string, label: string): ToolbarItem {
  return { id, label, implemented: false };
}

function live(id: string, label: string): ToolbarItem {
  return { id, label, implemented: true };
}

// Nav arrows moved INTO the Moves control on 2026-08-12 (Carson) —
// under its header collapsed, after the list expanded. The toolbar
// keeps window-level actions only.

/** Buttons to the right of the gap, excluding Flip and the engine toggle. */
function modeItems(
  mode: BoardModeCode,
  endedFrom: BoardModeCode | null,
): ToolbarItem[] {
  switch (mode) {
    case BoardMode.PLAYING:
      // Wired 2026-08-12; castle buttons dropped the same day (Carson)
      // — castling is just a king move on the board now.
      return [
        live('draw', 'Draw'),
        live('abort', 'Abort'),
        live('adjourn', 'Adjourn'),
        live('resign', 'Resign'),
      ];
    case BoardMode.OBSERVING:
      // Just Flip (Carson): the engine has its own control in the side
      // panel now, and Update/Winners never earned their pixels.
      return [];
    case BoardMode.EXAMINING:
      return [
        dead('setup', 'Setup'),
        dead('commit', 'Commit'),
        dead('revert', 'Revert'),
      ];
    case BoardMode.INACTIVE:
      // Save PGN wired 2026-08-12 — the window-local history + chessops
      // finally made it a pure export. Rematch (still dead) is only
      // offered when the ended game was OURS — an observed or examined
      // game has nobody to rematch (Carson, 2026-08-12).
      return endedFrom === BoardMode.PLAYING
        ? [live('rematch', 'Rematch'), live('save-pgn', 'Save PGN')]
        : [live('save-pgn', 'Save PGN')];
    case BoardMode.BUGHOUSE_SUGGEST:
      return [dead('update', 'Update')];
    default:
      return [];
  }
}

/**
 * The toolbar for a mode. SETUP is its own shape — no navigation and no
 * flip, because there is no move list to walk and the board is being built
 * rather than watched.
 */
export function toolbarLayoutFor(
  mode: BoardModeCode,
  opts: { endedFrom?: BoardModeCode | null } = {},
): ToolbarLayout {
  const endedFrom = opts.endedFrom ?? null;
  if (mode === BoardMode.SETUP) {
    return {
      left: [
        dead('setup-clear', 'Clear'),
        dead('setup-from-fen', 'FromFEN'),
        dead('setup-start', 'Start'),
      ],
      right: [dead('setup-done', 'Done')],
      autoPromote: false,
      autoDraw: false,
    };
  }

  return {
    left: [],
    right: [live('flip', 'Flip'), ...modeItems(mode, endedFrom)],
    // Only while playing. Examining moves pieces for you and observing
    // has no move of yours to promote, so the control would be a setting
    // with nothing to act on — and a checkbox that changes nothing is the
    // dead-button complaint this module was written to answer.
    autoPromote: mode === BoardMode.PLAYING,
    // Same reasoning: an auto-draw offer needs a game of ours to offer
    // it in. Observing or examining, there is nobody to offer it to.
    autoDraw: mode === BoardMode.PLAYING,
  };
}

/**
 * Clicking a piece box. Checkbox look, radio behaviour: a click arms that
 * piece and disarms whatever was armed, so the four boxes are never both
 * lit. Clicking the piece that is already armed clears it, which is the
 * only way back to the promotion picker — see `AutoPromote`.
 *
 * A pure function because it is the whole rule, and the whole rule is
 * worth pinning without a DOM: the failure it prevents is a promotion
 * silently playing a piece the board says is not selected.
 */
export function nextAutoPromote(
  current: AutoPromote,
  clicked: (typeof AUTO_PROMOTE_PIECES)[number],
): AutoPromote {
  return current === clicked ? 'off' : clicked;
}

const baseButtonStyle = {
  padding: '4px 10px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  fontSize: 12,
} as const;

export type ToolbarButtonProps = {
  disabled: boolean;
  title: string;
  style: Record<string, string | number>;
};

/**
 * What `TbButton` renders for an item. A button with no handler is
 * `disabled` — so it neither depresses nor takes focus — and dimmed with a
 * `not-allowed` cursor, so it reads as unfinished at a glance rather than on
 * click. The `title` says the same thing in words for anyone who hovers.
 */
export function toolbarButtonProps(item: ToolbarItem): ToolbarButtonProps {
  if (item.implemented) {
    return {
      disabled: false,
      title: item.label,
      style: { ...baseButtonStyle, cursor: 'pointer' },
    };
  }
  return {
    disabled: true,
    title: `${item.label} — ${NOT_IMPLEMENTED_HINT}`,
    style: {
      ...baseButtonStyle,
      cursor: 'not-allowed',
      opacity: 0.4,
    },
  };
}
