import { describe, it, expect } from 'vitest';
import { BoardMode, type BoardModeCode } from '@raptor3000/shared';
import {
  NOT_IMPLEMENTED_HINT,
  toolbarButtonProps,
  toolbarLayoutFor,
  type ToolbarItem,
} from '../boardToolbar.js';

/**
 * The toolbar as data: which buttons a mode gets, and how a button with
 * nothing behind it is rendered.
 *
 * The dimming rule is tested on synthetic items with `implemented` both ways,
 * not on the real ones — every real item is false today, and a test that
 * pinned that would have to be rewritten by the first commit that wires a
 * button, which is the commit least able to afford a confusing test failure.
 */

const ALL_MODES: BoardModeCode[] = [
  BoardMode.PLAYING,
  BoardMode.OBSERVING,
  BoardMode.EXAMINING,
  BoardMode.SETUP,
  BoardMode.INACTIVE,
  BoardMode.BUGHOUSE_SUGGEST,
];

function allItems(mode: BoardModeCode): ToolbarItem[] {
  const { left, right } = toolbarLayoutFor(mode);
  return [...left, ...right];
}

function labels(mode: BoardModeCode): string[] {
  return allItems(mode).map((i) => i.label);
}

describe('toolbarLayoutFor', () => {
  it('gives every mode a non-empty toolbar', () => {
    for (const mode of ALL_MODES) {
      expect(allItems(mode).length, mode).toBeGreaterThan(0);
    }
  });

  it('keeps ids unique within a mode, so React keys and handler lookup are safe', () => {
    for (const mode of ALL_MODES) {
      const ids = allItems(mode).map((i) => i.id);
      expect(new Set(ids).size, mode).toBe(ids.length);
    }
  });

  it('puts Flip on every mode except SETUP; nav lives in the Moves control', () => {
    // The arrows moved into the Moves control on 2026-08-12 (Carson).
    for (const mode of ALL_MODES) {
      if (mode === BoardMode.SETUP) continue;
      expect(labels(mode), mode).toContain('Flip');
      expect(labels(mode), mode).not.toContain('⏮');
    }
  });

  it('SETUP replaces the toolbar rather than adding to it', () => {
    // No move list to walk and nothing to flip: the board is being built.
    expect(labels(BoardMode.SETUP)).toEqual([
      'Clear',
      'FromFEN',
      'Start',
      'Done',
    ]);
    expect(toolbarLayoutFor(BoardMode.SETUP).right.map((i) => i.label)).toEqual([
      'Done',
    ]);
  });

  it('offers no Engine toggle anywhere — the side panel owns that now', () => {
    // 2026-08-12: the Engine control moved into the side panel
    // ("Engine: (best line) (multi line)"); a second switch in the
    // toolbar was redundant.
    for (const mode of ALL_MODES) {
      expect(labels(mode)).not.toContain('Engine');
    }
  });

  it('never offers the engine while the user is playing', () => {
    // Anti-cheating; the same rule engineAnalysisAllowed encodes, asserted
    // here because the toolbar is where a stray copy of it would appear.
    expect(labels(BoardMode.PLAYING)).not.toContain('Engine');
  });

  it('gives PLAYING the game-management buttons and no others', () => {
    expect(labels(BoardMode.PLAYING)).toEqual([
      'Flip',
      'Draw',
      'Abort',
      'Adjourn',
      'Resign',
    ]);
  });

  it('gives OBSERVING, EXAMINING, INACTIVE and BUGHOUSE_SUGGEST their own right-hand sets', () => {
    const right = (m: BoardModeCode) =>
      toolbarLayoutFor(m).right.map((i) => i.label);
    // OBSERVING slimmed to just Flip (Carson, 2026-08-12): Update and
    // Winners never earned their pixels.
    expect(right(BoardMode.OBSERVING)).toEqual(['Flip']);
    expect(right(BoardMode.EXAMINING)).toEqual([
      'Flip',
      'Setup',
      'Commit',
      'Revert',
    ]);
    // Rematch only when the ended game was ours (Carson, 2026-08-12);
    // an observed/examined game that went inactive has nobody to rematch.
    expect(right(BoardMode.INACTIVE)).toEqual(['Flip', 'Save PGN']);
    expect(
      toolbarLayoutFor(BoardMode.INACTIVE, { endedFrom: BoardMode.PLAYING })
        .right.map((i) => i.label),
    ).toEqual(['Flip', 'Rematch', 'Save PGN']);
    expect(
      toolbarLayoutFor(BoardMode.INACTIVE, { endedFrom: BoardMode.OBSERVING })
        .right.map((i) => i.label),
    ).toEqual(['Flip', 'Save PGN']);
    expect(right(BoardMode.BUGHOUSE_SUGGEST)).toEqual(['Flip', 'Update']);
  });

  it('returns fresh arrays, so a caller cannot mutate the next mode switch', () => {
    const first = toolbarLayoutFor(BoardMode.OBSERVING);
    first.right.pop();
    expect(toolbarLayoutFor(BoardMode.OBSERVING).right.map((i) => i.label))
      .toEqual(['Flip']);
  });
});

describe('toolbarButtonProps', () => {
  const wired: ToolbarItem = { id: 'x', label: 'Resign', implemented: true };
  const dead: ToolbarItem = { id: 'x', label: 'Resign', implemented: false };

  it('disables and dims a button with nothing behind it', () => {
    const props = toolbarButtonProps(dead);
    expect(props.disabled).toBe(true);
    expect(props.style.cursor).toBe('not-allowed');
    expect(Number(props.style.opacity)).toBeLessThan(1);
  });

  it('says so in words on hover', () => {
    expect(toolbarButtonProps(dead).title).toContain(NOT_IMPLEMENTED_HINT);
    expect(toolbarButtonProps(dead).title).toContain('Resign');
  });

  it('leaves a wired button live, undimmed and pointing', () => {
    const props = toolbarButtonProps(wired);
    expect(props.disabled).toBe(false);
    expect(props.style.cursor).toBe('pointer');
    expect(props.style.opacity).toBeUndefined();
    expect(props.title).toBe('Resign');
  });

  it('never advertises a dead button as clickable', () => {
    // The original complaint: the toolbar carried cursor:'pointer' on
    // buttons that did nothing, so it read as broken rather than unfinished.
    for (const mode of ALL_MODES) {
      for (const item of allItems(mode)) {
        const props = toolbarButtonProps(item);
        if (!item.implemented) {
          expect(props.style.cursor, `${mode}/${item.id}`).toBe('not-allowed');
          expect(props.disabled, `${mode}/${item.id}`).toBe(true);
        }
      }
    }
  });

  it('keeps the shared look — padding, border and font size do not depend on the branch', () => {
    const a = toolbarButtonProps(wired).style;
    const b = toolbarButtonProps(dead).style;
    for (const key of ['padding', 'border', 'borderRadius', 'fontSize', 'background']) {
      expect(b[key], key).toEqual(a[key]);
    }
  });
});
