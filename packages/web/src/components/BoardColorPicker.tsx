import {
  boardColors,
  BOARD_THEMES,
  type AppPreferences,
  type BoardTheme,
} from '../preferences.js';
import { isWoodTheme, woodGrainFor } from '../woodGrain.js';
import { WoodSquare } from './WoodSquare.js';
import { PreviewSelect } from './PreviewSelect.js';

/**
 * Board colours, shown as the squares they are (Carson, 2026-08-18:
 * "colors should be squares").
 *
 * A dropdown reading "Rosewood" tells you a word someone chose; four
 * squares tell you whether the dark is brown or nearly black and how much
 * contrast you get against the pieces — which is the entire question. The
 * wood themes are also grained rather than flat, so this reuses the real
 * `WoodSquare` instead of a solid fill; a flat swatch for Walnut would be
 * showing a colour the board never actually renders.
 *
 * Custom is in the list because it is a real theme, and it previews with
 * whatever the two colour fields currently hold — those fields appear
 * underneath once it is picked.
 */
export function BoardColorPicker({
  prefs,
  label,
  onChange,
}: {
  prefs: AppPreferences;
  /** Localized theme name — the strings already live in the message table. */
  label: (id: BoardTheme) => string;
  onChange: (id: BoardTheme) => void;
}) {
  return (
    <PreviewSelect<BoardTheme>
      value={prefs.boardTheme}
      options={BOARD_THEMES}
      label={label}
      groupLabel={label(prefs.boardTheme)}
      columnWidth={132}
      onChange={onChange}
      preview={(id, compact) => (
        <Squares prefs={prefs} theme={id} size={compact ? 18 : 30} />
      )}
    />
  );
}

/** Four squares in board order — light, dark, dark, light — so the pair
 *  reads as a corner of a board rather than a pair of paint chips. */
function Squares({
  prefs,
  theme,
  size,
}: {
  prefs: AppPreferences;
  theme: BoardTheme;
  size: number;
}) {
  const { light, dark } = boardColors({ ...prefs, boardTheme: theme });
  const wood = isWoodTheme(theme);
  const squares = ['a1', 'b1', 'a2', 'b2'] as const;
  return (
    <span
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(2, ${size}px)`,
        borderRadius: 3,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {squares.map((sq, i) => {
        // a1 dark, b1 light, a2 light, b2 dark — the real parity.
        const isDark = i === 0 || i === 3;
        const base = isDark ? dark : light;
        return (
          <span
            key={sq}
            style={{ width: size, height: size, background: base, position: 'relative' }}
          >
            {wood && <WoodSquare grain={woodGrainFor(sq)} base={base} />}
          </span>
        );
      })}
    </span>
  );
}
