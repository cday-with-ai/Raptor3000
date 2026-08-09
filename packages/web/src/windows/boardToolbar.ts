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
import {
  BoardMode,
  engineAnalysisAllowed,
  type BoardModeCode,
} from '@raptor3000/shared';

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
 */
export type ToolbarLayout = {
  left: ToolbarItem[];
  right: ToolbarItem[];
};

/** Hover text for a button with nothing behind it yet. */
export const NOT_IMPLEMENTED_HINT = 'not implemented yet';

function dead(id: string, label: string): ToolbarItem {
  return { id, label, implemented: false };
}

const navItems: ToolbarItem[] = [
  dead('nav-first', '⏮'),
  dead('nav-back', '◀'),
  dead('nav-forward', '▶'),
  dead('nav-last', '⏭'),
];

/** Buttons to the right of the gap, excluding Flip and the engine toggle. */
function modeItems(mode: BoardModeCode): ToolbarItem[] {
  switch (mode) {
    case BoardMode.PLAYING:
      return [
        dead('castle-short', 'O-O'),
        dead('castle-long', 'O-O-O'),
        dead('draw', 'Draw'),
        dead('abort', 'Abort'),
        dead('adjourn', 'Adjourn'),
        dead('resign', 'Resign'),
      ];
    case BoardMode.OBSERVING:
      return [dead('update', 'Update'), dead('winners', 'Winners')];
    case BoardMode.EXAMINING:
      return [
        dead('setup', 'Setup'),
        dead('commit', 'Commit'),
        dead('revert', 'Revert'),
      ];
    case BoardMode.INACTIVE:
      return [dead('rematch', 'Rematch'), dead('save-pgn', 'Save PGN')];
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
export function toolbarLayoutFor(mode: BoardModeCode): ToolbarLayout {
  if (mode === BoardMode.SETUP) {
    return {
      left: [
        dead('setup-clear', 'Clear'),
        dead('setup-from-fen', 'FromFEN'),
        dead('setup-start', 'Start'),
      ],
      right: [dead('setup-done', 'Done')],
    };
  }

  const engineToggle = engineAnalysisAllowed(mode)
    ? [dead('engine', 'Engine')]
    : [];

  return {
    left: navItems,
    right: [dead('flip', 'Flip'), ...engineToggle, ...modeItems(mode)],
  };
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
