/**
 * The rail around the 8×8. Square colors stay boardTheme; this is the
 * wood, the mat, or the original Chess Ascent chrome (rounded, light-mode
 * shadow).
 */

export const BOARD_FRAMES = [
  'shadow',
  'none',
  'walnut',
  'oak',
  'ebony',
  'mat',
  'club',
  'chronos',
] as const;
export type BoardFrame = (typeof BOARD_FRAMES)[number];

export type CoordPlacement = 'in-square' | 'rim';

export interface BoardFrameDesign {
  id: BoardFrame;
  label: string;
  blurb: string;
  /** Fraction of the outer board used as rail on each side. 0 = no rail. */
  gutter: number;
  radius: number;
  shadow: string;
  rail: string;
  /** Thin line between rail and squares. */
  piping: string;
  coords: CoordPlacement;
  /** Rim labels sit on all four sides (tournament mat) or left+bottom. */
  coordsAllSides: boolean;
  labelColor: string;
}

const WOOD_WALNUT =
  'repeating-linear-gradient(90deg, #5a3a22 0px, #6e4a2c 5px, #4a2e18 8px, #6a462a 13px, #5a3a22 18px)';
const WOOD_OAK =
  'repeating-linear-gradient(90deg, #c4a06a 0px, #d4b47c 5px, #b89058 9px, #d0ae74 14px, #c4a06a 18px)';
const WOOD_EBONY =
  'repeating-linear-gradient(90deg, #2a221c 0px, #3a3028 4px, #1c1612 8px, #322820 12px, #2a221c 16px)';

export const BOARD_FRAME_DESIGNS: Record<BoardFrame, BoardFrameDesign> = {
  shadow: {
    id: 'shadow',
    label: 'Shadow',
    blurb: 'The original. Four-pixel rounding, a drop shadow in Day, nothing extra.',
    gutter: 0,
    radius: 4,
    shadow: 'var(--board-shadow)',
    rail: 'transparent',
    piping: 'none',
    coords: 'in-square',
    coordsAllSides: false,
    labelColor: 'inherit',
  },
  none: {
    id: 'none',
    label: 'Flush',
    blurb: 'Squares to the edge. No rail, no shadow.',
    gutter: 0,
    radius: 0,
    shadow: 'none',
    rail: 'transparent',
    piping: 'none',
    coords: 'in-square',
    coordsAllSides: false,
    labelColor: 'inherit',
  },
  walnut: {
    id: 'walnut',
    label: 'Walnut',
    blurb: 'Dark wood rail. Files and ranks sit on the wood, not on the squares.',
    gutter: 0.072,
    radius: 3,
    shadow: '0 6px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)',
    rail: WOOD_WALNUT,
    piping: '1px solid #c4a06a',
    coords: 'rim',
    coordsAllSides: false,
    labelColor: '#e8d4b0',
  },
  oak: {
    id: 'oak',
    label: 'Oak',
    blurb: 'Lighter wood. A club set on a table, not a screen.',
    gutter: 0.072,
    radius: 3,
    shadow: '0 6px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)',
    rail: WOOD_OAK,
    piping: '1px solid #8a6840',
    coords: 'rim',
    coordsAllSides: false,
    labelColor: '#3a2a18',
  },
  ebony: {
    id: 'ebony',
    label: 'Ebony',
    blurb: 'Near-black wood, a thin highlight. Quiet and heavy.',
    gutter: 0.068,
    radius: 2,
    shadow: '0 8px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
    rail: WOOD_EBONY,
    piping: '1px solid #6a5a48',
    coords: 'rim',
    coordsAllSides: false,
    labelColor: '#c8b8a0',
  },
  mat: {
    id: 'mat',
    label: 'Mat',
    blurb: 'Tournament vinyl. Forest border, cream piping, letters on every side.',
    gutter: 0.084,
    radius: 2,
    shadow: '0 2px 10px rgba(0,0,0,0.22)',
    rail: '#1c3a28',
    piping: '2px solid #e8dcc0',
    coords: 'rim',
    coordsAllSides: true,
    labelColor: '#e8dcc0',
  },
  chronos: {
    id: 'chronos',
    label: 'Chronos',
    blurb: 'The tournament box, as a board. Bone housing, red hairline, numbers on the shell.',
    gutter: 0.075,
    radius: 6,
    shadow: '0 4px 12px rgba(0,0,0,0.22)',
    // The Chronos clock's housing, not its readout. Carson talked himself
    // to it live — "a red boarder... or silver... or was it white... yeah
    // they were an off white anyway whatever color the box was" — and the
    // box is bone plastic. The red belongs to the digits, so it appears
    // here as a hairline only, which is what ties the frame to the face
    // without turning the board into a warning label.
    rail: 'linear-gradient(180deg, #efe9dc 0%, #e2dbcb 55%, #d6cebc 100%)',
    piping: '1px solid #d24a4a',
    coords: 'rim',
    coordsAllSides: false,
    // Dark, because the rail is light — the opposite call from every wood
    // frame in this table.
    labelColor: '#3a332c',
  },

  club: {
    id: 'club',
    label: 'Club',
    blurb: 'Green baize lip inside a thin oak rail. The parish-hall board.',
    gutter: 0.07,
    radius: 3,
    shadow: '0 5px 14px rgba(0,0,0,0.24)',
    rail: '#243e2c',
    piping: '3px solid #c4a06a',
    coords: 'rim',
    coordsAllSides: false,
    labelColor: '#d8c8a0',
  },
};

export const BOARD_FRAME_LABELS: Record<BoardFrame, string> = {
  shadow: 'Shadow',
  none: 'Flush',
  walnut: 'Walnut',
  oak: 'Oak',
  ebony: 'Ebony',
  mat: 'Mat',
  club: 'Club',
  chronos: 'Chronos',
};
