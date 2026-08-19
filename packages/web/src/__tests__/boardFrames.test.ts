import { describe, it, expect } from 'vitest';
import {
  BOARD_FRAMES,
  BOARD_FRAME_DESIGNS,
  BOARD_FRAME_LABELS,
} from '../boardFrames.js';
import { DEFAULT_PREFERENCES } from '../preferences.js';

describe('board frames', () => {
  it('lists shadow first — the original chrome — but defaults to chronos', () => {
    // Shadow stays at the head of the roster because it is what the board
    // looked like before frames existed, and a returning user should find
    // it first. The DEFAULT moved to chronos on 2026-08-18 (Carson: "it
    // should also likely be the default") — a new board now arrives in the
    // bone tournament housing rather than with no rail at all.
    expect(BOARD_FRAMES[0]).toBe('shadow');
    expect(DEFAULT_PREFERENCES.boardFrame).toBe('chronos');
    expect(BOARD_FRAME_DESIGNS.shadow.gutter).toBe(0);
    expect(BOARD_FRAME_DESIGNS.shadow.shadow).toBe('var(--board-shadow)');
    expect(BOARD_FRAME_DESIGNS.shadow.coords).toBe('in-square');
  });

  it('every frame has a label, a rail, and a coord rule', () => {
    expect([...BOARD_FRAMES]).toEqual([
      'shadow', 'none', 'walnut', 'oak', 'ebony', 'mat', 'club', 'chronos',
    ]);
    for (const id of BOARD_FRAMES) {
      const d = BOARD_FRAME_DESIGNS[id];
      expect(BOARD_FRAME_LABELS[id]).toBe(d.label);
      expect(d.blurb.length).toBeGreaterThan(0);
      expect(d.gutter).toBeGreaterThanOrEqual(0);
      expect(d.coords === 'in-square' || d.coords === 'rim').toBe(true);
      if (d.coords === 'rim') expect(d.gutter).toBeGreaterThan(0);
    }
  });

  it('chronos wears the clock housing, not the clock readout', () => {
    const d = BOARD_FRAME_DESIGNS.chronos;
    // Bone rail: the physical box. The red is the digits' colour and is
    // allowed in only as a hairline — if it ever becomes the rail, the
    // board has turned into a warning label.
    expect(d.rail).toContain('#efe9dc');
    expect(d.piping).toBe('1px solid #d24a4a');
    expect(d.rail).not.toContain('#d24a4a');
    // Light rail means dark labels — the opposite call from every wood
    // frame in the table.
    expect(d.labelColor).toBe('#3a332c');
    expect(d.coords).toBe('rim');
  });
});
