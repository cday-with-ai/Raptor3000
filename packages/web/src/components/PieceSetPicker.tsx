import { boardColors, PIECE_SETS, type AppPreferences, type PieceSet } from '../preferences.js';
import { PreviewSelect } from './PreviewSelect.js';

/**
 * Piece set, picked by looking at the pieces.
 *
 * This was the one visual choice on the options page with no preview at all
 * — a `<select>` of five names, so telling Cardinal from Leipzig meant
 * choosing one, closing options, and finding a board. The pieces are already
 * on disk as SVGs; showing them costs nothing.
 *
 * **One of each piece** (Carson, 2026-08-18). A sample of two was the wrong
 * economy: sets differ in exactly the places a partial row hides — Leipzig's
 * rook crenellations, how tall a bishop's mitre runs, whether the king wears
 * a cross or a crown. Six shapes is the whole alphabet, so the row answers
 * the question instead of hinting at it.
 *
 * Both colours everywhere, collapsed included (Carson: "both white and
 * black"). A set can be legible in white and muddy in black — Leipzig's
 * black knight is a different judgement from its white one — so a preview
 * showing one colour is answering half the question. The trigger grows by a
 * row and is still one glance.
 */
const WHITE = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'] as const;
const BLACK = ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP'] as const;

export const PIECE_SET_LABELS: Record<PieceSet, string> = {
  alpha: 'Alpha',
  asog: 'A Shortfall Of Gravitas',
  cardinal: 'Cardinal',
  cburnett: 'Cburnett',
  jrti: 'Just Read The Instructions',
  leipzig: 'Leipzig',
  mpchess: 'MPChess',
  ocisly: 'Of Course I Still Love You',
  subtlety: 'So Much For Subtlety',
  vlgi: 'Very Little Gravitas Indeed',
};

export function PieceSetPicker({
  prefs,
  onChange,
}: {
  prefs: AppPreferences;
  onChange: (id: PieceSet) => void;
}) {
  const { light, dark } = boardColors(prefs);
  return (
    <PreviewSelect<PieceSet>
      value={prefs.pieceSet}
      options={PIECE_SETS}
      label={id => PIECE_SET_LABELS[id]}
      groupLabel={PIECE_SET_LABELS[prefs.pieceSet]}
      columnWidth={220}
      onChange={onChange}
      preview={(id, compact) => {
        const size = compact ? 18 : 25;
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PieceRow set={id} codes={WHITE} light={light} dark={dark} size={size} />
            <PieceRow set={id} codes={BLACK} light={light} dark={dark} size={size} offset />
          </span>
        );
      }}
    />
  );
}

/** The pieces on their own squares, so a light set on a light square is
 *  visible as the problem it is. `offset` starts the second rank on the
 *  opposite colour, the way the two back ranks actually sit on a board. */
function PieceRow({
  set,
  codes,
  light,
  dark,
  size,
  offset,
}: {
  set: PieceSet;
  codes: readonly string[];
  light: string;
  dark: string;
  size: number;
  offset?: boolean;
}) {
  return (
    <span style={{ display: 'flex', borderRadius: 3, overflow: 'hidden' }}>
      {codes.map((code, i) => (
        <span
          key={code}
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: (i + (offset ? 1 : 0)) % 2 === 0 ? light : dark,
          }}
        >
          <img
            src={`/pieces/${set}/${code}.svg`}
            alt=""
            width={size}
            height={size}
            draggable={false}
            style={{ display: 'block' }}
          />
        </span>
      ))}
    </span>
  );
}
