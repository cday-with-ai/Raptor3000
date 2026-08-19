import { useEffect, useState } from 'react';
import type { AppPreferences } from '../preferences.js';
import { clockChipColors } from '../preferences.js';
import { CLOCK_DESIGNS, formatClock, type ClockSet } from '../clockDesigns.js';
import { readDocumentTheme, type ResolvedTheme } from '../theme.js';
import { SevenSegTime } from './SevenSeg.js';

/**
 * Subscribe to the document's resolved palette. Theme flips only write
 * `data-theme` (CSS vars update for free); hexes computed at render
 * time need this to notice. MutationObserver so a flip in THIS window
 * is seen — storage events do not fire in the writer.
 */
export function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = useState<ResolvedTheme>(readDocumentTheme);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const el = document.documentElement;
    const read = () => setTheme(readDocumentTheme());
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/**
 * The face of a chess clock. Design (font, housing, lamp, colon) comes
 * from `prefs.clockSet`; per-state colors still honor the Options
 * overrides through `clockChipColors`.
 */
export function ClockChip({
  ms,
  ticking,
  prefs,
  theme,
}: {
  ms: number;
  ticking: boolean;
  prefs: AppPreferences;
  theme: ResolvedTheme;
}) {
  const set: ClockSet = prefs.clockSet;
  const design = CLOCK_DESIGNS[set];
  const { main, tenths, low } = formatClock(ms);
  const chip = clockChipColors(prefs, ticking, low, theme);
  const parts = main.split(':');
  const timeText = tenths !== null ? `${main}.${tenths}` : main;
  const digits =
    design.digits === 'seven' ? (
      <SevenSegTime
        text={timeText}
        color={chip.text}
        height={low ? design.digitSizeLow : design.digitSize}
        ghost={design.ghost}
        blinkColon={ticking && design.colonBlink}
      />
    ) : (
      <>
        {parts.map((p, i) => (
          <span key={`${p}-${i}`}>
            {i > 0 && (
              <span
                className={ticking && design.colonBlink ? 'raptor-clock-colon' : undefined}
                style={{ display: 'inline-block', width: '0.55em', textAlign: 'center' }}
              >
                :
              </span>
            )}
            {p}
          </span>
        ))}
        {tenths !== null && <span style={{ opacity: 0.8 }}>.{tenths}</span>}
      </>
    );

  return (
    <span
      className={low && ticking && design.lowPulse !== false ? 'raptor-clock-low' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: design.lamp ? 8 : 0,
        fontFamily: design.digitFont,
        fontSize: low ? design.digitSizeLow : design.digitSize,
        fontWeight: low ? design.digitWeightLow : design.digitWeight,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: design.tracking,
        padding: `${design.padY}px ${design.padX}px`,
        background: chip.bg,
        border: `${design.borderWidth}px solid ${chip.border}`,
        color: chip.text,
        borderRadius: design.radius,
        minWidth: design.minWidth,
        justifyContent: 'center',
        boxShadow: chip.glow,
        lineHeight: 1.15,
        textAlign: 'center',
      }}
    >
      {design.lamp && (
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: ticking
              ? low
                ? (design.lampLow ?? '#ff6a3d')
                : (design.lampOn ?? '#5adf6a')
              : (design.lampOff ?? '#2a2a24'),
            boxShadow:
              ticking && design.lampGlow !== false
                ? `0 0 6px ${low ? (design.lampLow ?? '#ff6a3d') : (design.lampOn ?? '#5adf6a')}`
                : 'none',
            flex: '0 0 auto',
          }}
        />
      )}
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {design.ghost && design.digits === 'font' && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.16,
              pointerEvents: 'none',
            }}
          >
            {timeText.replace(/\d/g, '8')}
          </span>
        )}
        <span style={{ position: 'relative' }}>{digits}</span>
      </span>
    </span>
  );
}
