/**
 * Clock faces. Each one is a full look — digits, housing, band, the
 * three states (idle / active / low) in both Day and Night — not a
 * color tweak on the original chip.
 *
 * Alpha and Digital are Carson's from Simple FICS Interface — the
 * teal capsule with the custom digital font, and its quieter sibling.
 * Classic keeps the 2026-08-12 stock chips. The rest are new.
 */

export const CLOCK_SETS = [
  'alpha',
  'digital',
  'lcd',
  'chronos',
  'classic',
  'dgt',
  'flag',
  'terminal',
  'glass',
  'bronze',
] as const;
export type ClockSet = (typeof CLOCK_SETS)[number];

export type ClockTheme = 'dark' | 'light';
export type ClockFaceState = 'active' | 'low' | 'idle';

export interface ClockChipTokens {
  bg: string;
  text: string;
  border: string;
  glow?: string;
}

export interface ClockBarTokens {
  bg: string;
  border: string;
  radius: number;
  padY: number;
  padX: number;
  nameSize: number;
  nameWeight: number;
  nameColor: string;
  ratingColor: string;
}

export interface ClockDesign {
  id: ClockSet;
  label: string;
  blurb: string;
  digitFont: string;
  /** Drawn bars instead of a typeface — Chronos / LCD. */
  digits: 'font' | 'seven';
  nameFont: string;
  digitWeight: number;
  digitWeightLow: number;
  digitSize: number;
  digitSizeLow: number;
  radius: number;
  padY: number;
  padX: number;
  tracking: string;
  minWidth: number;
  borderWidth: number;
  colonBlink: boolean;
  /** A small status lamp on the ticking face (DGT green, Chronos red). */
  lamp: boolean;
  lampOn?: string;
  lampLow?: string;
  lampOff?: string;
  /** Halo on the side lamp. Off for quiet faces. */
  lampGlow?: boolean;
  /** Pulse the chip under ten seconds. Off for quiet faces. */
  lowPulse?: boolean;
  /** Faded 8s behind the digits — the unused segments of a real LCD. */
  ghost: boolean;
  bar: Record<ClockTheme, ClockBarTokens>;
  chip: Record<ClockTheme, Record<ClockFaceState, ClockChipTokens>>;
}

/** The original stock chips. Classic uses these in both themes. */
export const CLASSIC_CHIPS: Record<ClockFaceState, ClockChipTokens> = {
  active: { bg: '#2a4a2a', text: '#ffffff', border: '#3a6a3a' },
  low: { bg: '#5a2a2a', text: '#ffd9d9', border: '#a04040' },
  idle: { bg: 'var(--bg-sunken)', text: 'inherit', border: 'var(--border-soft)' },
};

const CLASSIC_BAR: ClockBarTokens = {
  bg: 'var(--bg-raised)',
  border: 'var(--border-soft)',
  radius: 6,
  padY: 4,
  padX: 10,
  nameSize: 13,
  nameWeight: 700,
  nameColor: 'var(--fg)',
  ratingColor: 'var(--fg-muted)',
};

const DIGIT_MONO = '"IBM Plex Mono", "SF Mono", Consolas, ui-monospace, monospace';
const DIGIT_LED = '"Share Tech Mono", "IBM Plex Mono", "SF Mono", Consolas, monospace';
const DIGIT_SFI = 'DigitalFont, "Share Tech Mono", "Courier New", monospace';
const DIGIT_LCD = 'DSEG7Classic, DigitalFont, "Courier New", monospace';
const DIGIT_LED7 = 'DSEG7Modern, DSEG7Classic, DigitalFont, "Courier New", monospace';
const NAME_UI = 'system-ui, "Segoe UI", sans-serif';
const NAME_SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';

export const CLOCK_DESIGNS: Record<ClockSet, ClockDesign> = {
  alpha: {
    id: 'alpha',
    label: 'Alpha',
    blurb: 'Yours, from Simple FICS. Teal capsule, digital font, the one that already knew how to sit on a board.',
    digitFont: DIGIT_SFI,
    digits: 'font',
    nameFont: NAME_UI,
    digitWeight: 400,
    digitWeightLow: 400,
    digitSize: 22,
    digitSizeLow: 22,
    radius: 10,
    padY: 4,
    padX: 12,
    tracking: '0.1em',
    minWidth: 88,
    borderWidth: 3,
    colonBlink: true,
    lamp: false,
    ghost: false,
    bar: {
      dark: { ...CLASSIC_BAR, padY: 6 },
      light: { ...CLASSIC_BAR, padY: 6 },
    },
    chip: {
      dark: {
        active: { bg: '#1a4d5c', text: '#a3e9ec', border: '#2d7a84' },
        low: { bg: '#1a4d5c', text: '#ff6b6b', border: '#c04040' },
        idle: { bg: '#2a3038', text: '#8a929c', border: '#3a424c' },
      },
      light: {
        active: { bg: '#e0f7fa', text: '#006064', border: '#006064' },
        low: { bg: '#e0f7fa', text: '#c62828', border: '#c62828' },
        idle: { bg: '#eceef2', text: 'var(--fg-dim)', border: '#d5dae0' },
      },
    },
  },

  digital: {
    id: 'digital',
    label: 'Digital',
    blurb: 'The quieter Simple FICS face. Same font, thinner chrome, error-red when the flag is close.',
    digitFont: DIGIT_SFI,
    digits: 'font',
    nameFont: NAME_UI,
    digitWeight: 400,
    digitWeightLow: 400,
    digitSize: 18,
    digitSizeLow: 20,
    radius: 6,
    padY: 4,
    padX: 10,
    tracking: '0.1em',
    minWidth: 80,
    borderWidth: 2,
    colonBlink: true,
    lamp: false,
    ghost: false,
    bar: { dark: CLASSIC_BAR, light: CLASSIC_BAR },
    chip: {
      dark: {
        active: { bg: 'var(--bg-sunken)', text: 'var(--fg)', border: 'var(--border-strong)' },
        low: { bg: 'var(--bg-sunken)', text: '#ff6b6b', border: '#c04040' },
        idle: { bg: 'var(--bg-sunken)', text: 'var(--fg-muted)', border: 'var(--border-soft)' },
      },
      light: {
        active: { bg: 'var(--bg-sunken)', text: 'var(--fg)', border: 'var(--border-strong)' },
        low: { bg: 'var(--bg-sunken)', text: '#c62828', border: '#c62828' },
        idle: { bg: 'var(--bg-sunken)', text: 'var(--fg-muted)', border: 'var(--border-soft)' },
      },
    },
  },

  lcd: {
    id: 'lcd',
    label: 'LCD',
    blurb: 'Seven-segment module. Unused 8s sit behind the time, the way a real cell does.',
    digitFont: DIGIT_LCD,
    digits: 'seven',
    nameFont: NAME_UI,
    digitWeight: 400,
    digitWeightLow: 400,
    digitSize: 22,
    digitSizeLow: 22,
    radius: 4,
    padY: 6,
    padX: 10,
    tracking: '0.06em',
    minWidth: 96,
    borderWidth: 2,
    colonBlink: true,
    lamp: false,
    ghost: true,
    bar: {
      dark: { ...CLASSIC_BAR, padY: 6 },
      light: { ...CLASSIC_BAR, padY: 6 },
    },
    chip: {
      dark: {
        active: { bg: '#141810', text: '#b8d46a', border: '#2a3220', glow: 'inset 0 1px 0 #b8d46a22' },
        low: { bg: '#181410', text: '#e0a040', border: '#5a3a14' },
        idle: { bg: '#141810', text: '#4a5830', border: '#2a3220' },
      },
      light: {
        active: { bg: '#c4c8b0', text: '#2c3218', border: '#9aa088' },
        low: { bg: '#c8b8a8', text: '#8a2018', border: '#a88878' },
        idle: { bg: '#c4c8b0', text: '#8a9078', border: '#9aa088' },
      },
    },
  },

  chronos: {
    id: 'chronos',
    label: 'Chronos',
    blurb: 'The metal tournament box. Numbers, a colon, a tenth when it matters.',
    digitFont: DIGIT_LED7,
    digits: 'seven',
    nameFont: NAME_UI,
    digitWeight: 400,
    digitWeightLow: 400,
    digitSize: 24,
    digitSizeLow: 24,
    radius: 2,
    padY: 5,
    padX: 10,
    tracking: '0.04em',
    minWidth: 100,
    borderWidth: 1,
    colonBlink: false,
    // The side-to-move indicator. It was switched off with the rest of
    // Chronos's motion (grok's note: "Chronos quieted — no glow/pulse/colon
    // blink/lamp"), but the lamp is not motion: the real tournament box
    // carries a small lit dot for whose clock is running, and without it
    // this face is the only one that cannot tell you at a glance. So the
    // lamp comes back and the glow stays off — lit, not animated, which is
    // what the hardware does. Carson: "the side to move in chronos had a
    // dot too didnt it?"
    lamp: true,
    lampOn: '#d24a4a',
    lampLow: '#e08040',
    lampOff: '#3a2c2c',
    lampGlow: false,
    lowPulse: false,
    ghost: false,
    bar: {
      dark: { ...CLASSIC_BAR, padY: 6 },
      light: { ...CLASSIC_BAR, padY: 6 },
    },
    chip: {
      dark: {
        active: { bg: '#161618', text: '#d24a4a', border: '#2c2c30' },
        low: { bg: '#161618', text: '#c45c38', border: '#2c2c30' },
        idle: { bg: '#161618', text: '#a07878', border: '#2c2c30' },
      },
      light: {
        active: { bg: '#1a1a1c', text: '#c84444', border: '#2c2c30' },
        low: { bg: '#1a1a1c', text: '#b05030', border: '#2c2c30' },
        idle: { bg: '#1a1a1c', text: '#966868', border: '#2c2c30' },
      },
    },
  },

  classic: {
    id: 'classic',
    label: 'Classic',
    blurb: 'The original pills, tightened. Tabular digits, same green and red.',
    digitFont: '"SF Mono", Consolas, ui-monospace, monospace',
    digits: 'font',
    nameFont: NAME_UI,
    digitWeight: 500,
    digitWeightLow: 700,
    digitSize: 18,
    digitSizeLow: 20,
    radius: 4,
    padY: 2,
    padX: 10,
    tracking: '0.02em',
    minWidth: 76,
    borderWidth: 1,
    colonBlink: false,
    lamp: false,
    ghost: false,
    bar: { dark: CLASSIC_BAR, light: CLASSIC_BAR },
    chip: { dark: CLASSIC_CHIPS, light: CLASSIC_CHIPS },
  },

  dgt: {
    id: 'dgt',
    label: 'DGT',
    blurb: 'Tournament housing. Amber LEDs on a black module. Always a physical clock.',
    digitFont: DIGIT_LED,
    digits: 'font',
    nameFont: NAME_UI,
    digitWeight: 400,
    digitWeightLow: 400,
    digitSize: 22,
    digitSizeLow: 22,
    radius: 3,
    padY: 5,
    padX: 12,
    tracking: '0.08em',
    minWidth: 92,
    borderWidth: 1,
    colonBlink: true,
    lamp: true,
    ghost: false,
    bar: {
      dark: {
        ...CLASSIC_BAR,
        bg: 'color-mix(in srgb, var(--bg-raised) 82%, #000)',
        padY: 6,
      },
      light: {
        ...CLASSIC_BAR,
        bg: 'color-mix(in srgb, var(--bg-raised) 88%, #1a1814)',
        padY: 6,
      },
    },
    chip: {
      dark: {
        active: { bg: '#141410', text: '#f5b942', border: '#3a3424', glow: '0 0 10px #f5b94244' },
        low: { bg: '#1a0c0a', text: '#ff6a3d', border: '#6a2818', glow: '0 0 12px #ff6a3d55' },
        idle: { bg: '#141410', text: '#8a6a28', border: '#2a2820' },
      },
      light: {
        active: { bg: '#16140f', text: '#e8a830', border: '#3a3424', glow: '0 0 8px #e8a83033' },
        low: { bg: '#1c0e0c', text: '#ee5a30', border: '#6a2818', glow: '0 0 10px #ee5a3033' },
        idle: { bg: '#16140f', text: '#7a5e24', border: '#2a2820' },
      },
    },
  },

  flag: {
    id: 'flag',
    label: 'Flag',
    blurb: 'Club clock. Cream face, ink digits, a wooden-table quiet.',
    digitFont: DIGIT_MONO,
    digits: 'font',
    nameFont: NAME_SERIF,
    digitWeight: 600,
    digitWeightLow: 700,
    digitSize: 19,
    digitSizeLow: 20,
    radius: 5,
    padY: 4,
    padX: 12,
    tracking: '0.04em',
    minWidth: 84,
    borderWidth: 1,
    colonBlink: false,
    lamp: false,
    ghost: false,
    bar: {
      dark: {
        ...CLASSIC_BAR,
        bg: '#2c261c',
        border: '#4a4030',
        nameColor: '#efe6d2',
        ratingColor: '#b4a890',
      },
      light: {
        ...CLASSIC_BAR,
        bg: '#f4eee0',
        border: '#d4cbb4',
        nameColor: '#2a2218',
        ratingColor: '#6a5e4c',
      },
    },
    chip: {
      dark: {
        active: { bg: '#3a3226', text: '#efe6d2', border: '#6a5a38' },
        low: { bg: '#5a281c', text: '#f4d0c0', border: '#a04028' },
        idle: { bg: '#241e16', text: '#b4a890', border: '#3a3226' },
      },
      light: {
        active: { bg: '#e8d9b4', text: '#2a2218', border: '#c4b48a' },
        low: { bg: '#c44a2a', text: '#fff4ea', border: '#a03820' },
        idle: { bg: '#f7f1e4', text: '#5a5040', border: '#d4cbb4' },
      },
    },
  },

  terminal: {
    id: 'terminal',
    label: 'Terminal',
    blurb: 'Phosphor on a sunken well. The FICS client that lived in a tty.',
    digitFont: DIGIT_MONO,
    digits: 'font',
    nameFont: DIGIT_MONO,
    digitWeight: 500,
    digitWeightLow: 600,
    digitSize: 18,
    digitSizeLow: 19,
    radius: 2,
    padY: 4,
    padX: 10,
    tracking: '0.06em',
    minWidth: 84,
    borderWidth: 1,
    colonBlink: true,
    lamp: false,
    ghost: false,
    bar: {
      dark: {
        ...CLASSIC_BAR,
        bg: '#071108',
        border: '#1a3320',
        radius: 2,
        nameColor: '#4dff7a',
        ratingColor: '#2a7a42',
        nameSize: 12,
        nameWeight: 500,
      },
      light: {
        ...CLASSIC_BAR,
        bg: '#e8f0e8',
        border: '#b4c8b4',
        radius: 2,
        nameColor: '#145028',
        ratingColor: '#3a6a48',
        nameSize: 12,
        nameWeight: 500,
      },
    },
    chip: {
      dark: {
        active: { bg: '#0a160c', text: '#4dff7a', border: '#1e4a28', glow: '0 0 8px #4dff7a33' },
        low: { bg: '#160808', text: '#ff5555', border: '#6a2020', glow: '0 0 8px #ff555544' },
        idle: { bg: '#0c1810', text: '#2a7a42', border: '#1a3320' },
      },
      light: {
        active: { bg: '#dcecdc', text: '#146028', border: '#8ab490' },
        low: { bg: '#f0d4d4', text: '#a01818', border: '#d08080' },
        idle: { bg: '#e4ece4', text: '#3a6a48', border: '#b4c8b4' },
      },
    },
  },

  glass: {
    id: 'glass',
    label: 'Glass',
    blurb: 'Almost no chrome. Large type, a thin edge, the board does the talking.',
    digitFont: DIGIT_MONO,
    digits: 'font',
    nameFont: NAME_UI,
    digitWeight: 500,
    digitWeightLow: 700,
    digitSize: 22,
    digitSizeLow: 24,
    radius: 8,
    padY: 3,
    padX: 8,
    tracking: '0.01em',
    minWidth: 80,
    borderWidth: 1,
    colonBlink: false,
    lamp: false,
    ghost: false,
    bar: {
      dark: { ...CLASSIC_BAR, bg: 'transparent', border: 'transparent', padY: 6, padX: 4 },
      light: { ...CLASSIC_BAR, bg: 'transparent', border: 'transparent', padY: 6, padX: 4 },
    },
    chip: {
      dark: {
        active: { bg: 'transparent', text: '#d8ecff', border: 'transparent' },
        low: { bg: 'transparent', text: '#ff8a7a', border: 'transparent' },
        idle: { bg: 'transparent', text: 'var(--fg-muted)', border: 'transparent' },
      },
      light: {
        active: { bg: 'transparent', text: '#1a4a8a', border: 'transparent' },
        low: { bg: 'transparent', text: '#b02018', border: 'transparent' },
        idle: { bg: 'transparent', text: 'var(--fg-muted)', border: 'transparent' },
      },
    },
  },

  bronze: {
    id: 'bronze',
    label: 'Bronze',
    blurb: 'Warm metal bezel, dark face, cream digits. A study clock.',
    digitFont: DIGIT_MONO,
    digits: 'font',
    nameFont: NAME_SERIF,
    digitWeight: 600,
    digitWeightLow: 700,
    digitSize: 19,
    digitSizeLow: 20,
    radius: 4,
    padY: 4,
    padX: 11,
    tracking: '0.05em',
    minWidth: 86,
    borderWidth: 1,
    colonBlink: true,
    lamp: false,
    ghost: false,
    bar: {
      dark: {
        ...CLASSIC_BAR,
        bg: '#221c16',
        border: '#4a3c2c',
        nameColor: '#e2b87a',
        ratingColor: '#8a7350',
      },
      light: {
        ...CLASSIC_BAR,
        bg: '#efe4d2',
        border: '#c8b090',
        nameColor: '#3a2e22',
        ratingColor: '#7a6850',
      },
    },
    chip: {
      dark: {
        active: { bg: '#1f1812', text: '#e2b87a', border: '#6a5438', glow: 'inset 0 1px 0 #e2b87a22' },
        low: { bg: '#3a1810', text: '#ffb08a', border: '#8a4030' },
        idle: { bg: '#16120e', text: '#8a7350', border: '#3a2e22' },
      },
      light: {
        active: { bg: '#3a2e22', text: '#f0d4a8', border: '#6a5438' },
        low: { bg: '#6a2818', text: '#ffe0d0', border: '#8a4030' },
        idle: { bg: '#e6d8c4', text: '#5a4a38', border: '#c8b090' },
      },
    },
  },
};

export const CLOCK_SET_LABELS: Record<ClockSet, string> = {
  alpha: 'Alpha',
  digital: 'Digital',
  lcd: 'LCD',
  chronos: 'Chronos',
  classic: 'Classic',
  dgt: 'DGT',
  flag: 'Flag',
  terminal: 'Terminal',
  glass: 'Glass',
  bronze: 'Bronze',
};

export function formatClock(ms: number): {
  main: string;
  tenths: string | null;
  low: boolean;
} {
  const total = Math.max(0, ms);
  const low = total < 10_000;
  const totalSeconds = Math.floor(total / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const tenths = low ? Math.floor((total % 1000) / 100) : null;
  const mm = h > 0 ? m.toString().padStart(2, '0') : String(m);
  const ss = s.toString().padStart(2, '0');
  const main = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  return { main, tenths: tenths === null ? null : String(tenths), low };
}

export function clockState(ticking: boolean, lowTime: boolean): ClockFaceState {
  return ticking ? (lowTime ? 'low' : 'active') : 'idle';
}

/** Unused LCD segments — same width as the live time, every digit an 8. */
export function lcdGhost(main: string, tenths: string | null): string {
  return main.replace(/\d/g, '8') + (tenths !== null ? '.8' : '');
}
