import { describe, it, expect } from 'vitest';
import {
  CLOCK_DESIGNS,
  CLOCK_SETS,
  formatClock,
  clockState,
  lcdGhost,
} from '../clockDesigns.js';

describe('formatClock', () => {
  it('renders minutes:seconds, then hours when they exist', () => {
    expect(formatClock(0)).toEqual({ main: '0:00', tenths: '0', low: true });
    expect(formatClock(61_000)).toEqual({ main: '1:01', tenths: null, low: false });
    expect(formatClock(3_661_000)).toEqual({ main: '1:01:01', tenths: null, low: false });
  });

  it('shows tenths under ten seconds and never goes negative', () => {
    expect(formatClock(9_500)).toEqual({ main: '0:09', tenths: '5', low: true });
    expect(formatClock(-400)).toEqual({ main: '0:00', tenths: '0', low: true });
  });

  it('the LCD ghost is the same width, every digit an 8', () => {
    expect(lcdGhost('1:01', null)).toBe('8:88');
    expect(lcdGhost('0:09', '5')).toBe('8:88.8');
    expect(lcdGhost('1:01:01', null)).toBe('8:88:88');
  });

  it('the face is only digits, colons, and an optional tenth', () => {
    for (const ms of [0, 9500, 61_000, 3_661_000]) {
      const { main, tenths } = formatClock(ms);
      const shown = tenths === null ? main : `${main}.${tenths}`;
      expect(shown).toMatch(/^[0-9:.]+$/);
    }
  });
});

describe('clockState', () => {
  it('low only while ticking', () => {
    expect(clockState(false, true)).toBe('idle');
    expect(clockState(true, true)).toBe('low');
    expect(clockState(true, false)).toBe('active');
  });
});

describe('clock designs', () => {
  it('every face has both themes and all three states', () => {
    expect([...CLOCK_SETS]).toEqual([
      'alpha', 'digital', 'lcd', 'chronos', 'classic', 'dgt', 'flag', 'terminal', 'glass', 'bronze',
    ]);
    expect(CLOCK_DESIGNS.lcd.ghost).toBe(true);
    expect(CLOCK_DESIGNS.lcd.digits).toBe('seven');
    expect(CLOCK_DESIGNS.chronos.digits).toBe('seven');
    for (const id of CLOCK_SETS) {
      const d = CLOCK_DESIGNS[id];
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.digitFont.length).toBeGreaterThan(0);
      for (const theme of ['dark', 'light'] as const) {
        for (const state of ['active', 'low', 'idle'] as const) {
          const chip = d.chip[theme][state];
          expect(chip.bg.length).toBeGreaterThan(0);
          expect(chip.text.length).toBeGreaterThan(0);
          expect(chip.border.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('active and idle digits are distinct in every face', () => {
    for (const id of CLOCK_SETS) {
      for (const theme of ['dark', 'light'] as const) {
        const a = CLOCK_DESIGNS[id].chip[theme].active;
        const i = CLOCK_DESIGNS[id].chip[theme].idle;
        expect(JSON.stringify(a)).not.toBe(JSON.stringify(i));
      }
    }
  });
});
