import type { BoardTheme } from './preferences.js';

/**
 * What colour an in-square coordinate is drawn in.
 *
 * The rule is derived, not tabulated: a label sitting on a light square is
 * drawn in the dark square's colour and vice versa. That is what real
 * boards do, it needs no per-theme maintenance, and — the part that decides
 * it — **it is the only rule that can work for `custom`**, where the user
 * picks both square colours and no lookup table can know them in advance.
 * So the derived rule stays as the floor no matter what else is added here.
 *
 * On top of that, a theme may override the ink. Carson, 2026-08-18: "maybe
 * each square set has suggest labels if they are in the board squares? or
 * has their own label colors?" The override exists because the derived rule
 * is *conventional*, not *always legible*: it fails wherever a theme's two
 * squares are close together in value, since the opposite colour is then
 * barely a contrast at all.
 *
 * Which is a measurable condition, so the entries below are only the themes
 * that actually fail it, rather than a colour for all ten:
 *
 * Measured as WCAG contrast of the label against the light square, since
 * that is the failing direction — derived, then with the override:
 *
 *   ic      1.58:1 -> 3.02:1   khaki on near-white; all but invisible
 *   maple   2.02:1 -> 4.09:1   two warm mid-tones, little separation
 *   blue    2.06:1 -> 3.80:1   grey on pale grey, marginal
 *
 * Left derived, because they already clear those numbers or are the
 * convention nobody has complained about:
 *
 *   mat     3.96:1             better than any override here would be
 *   brown   2.29:1             lichess's own pairing, and the default
 *
 * An entry added here should carry its measurement the same way. The bar is
 * "the derived rule measurably fails", not "another colour might look nice"
 * — every entry added is a theme that stops tracking its own squares.
 */
export interface LabelInk {
  /** Ink for a coordinate printed on a LIGHT square. */
  onLight: string;
  /** Ink for a coordinate printed on a DARK square. */
  onDark: string;
}

export const BOARD_THEME_LABEL_INK: Partial<Record<BoardTheme, LabelInk>> = {
  ic: { onLight: '#8a8a5e', onDark: '#f4f4f4' },
  maple: { onLight: '#8a6636', onDark: '#f7ecd8' },
  blue: { onLight: '#5d7480', onDark: '#eef2f4' },
};

/**
 * Resolve the ink for one in-square coordinate.
 *
 * `light` and `dark` are the theme's actual square colours, passed in
 * rather than looked up so that `custom` — whose colours live in the
 * preference object, not in any table — resolves through exactly the same
 * path as every other theme.
 */
export function inSquareInk(
  theme: BoardTheme,
  onDarkSquare: boolean,
  light: string,
  dark: string,
): string {
  const override = BOARD_THEME_LABEL_INK[theme];
  if (override) return onDarkSquare ? override.onDark : override.onLight;
  return onDarkSquare ? light : dark;
}
