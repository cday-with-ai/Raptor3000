import { describe, expect, it } from 'vitest';
import { isWoodTheme, shiftHex, woodGrainFor, woodRail } from '../woodGrain.js';

describe('woodGrainFor', () => {
  it('is stable per square and different between squares', () => {
    expect(woodGrainFor('a1')).toEqual(woodGrainFor('a1'));
    expect(woodGrainFor('a1')).not.toEqual(woodGrainFor('e4'));
  });

  it('keeps the leaf-to-leaf shade drift small', () => {
    // Two leaves off one log differ; a board whose squares differ enough
    // to notice stops reading as one board. 1.8% is the ceiling.
    for (const f of 'abcdefgh') {
      for (let r = 1; r <= 8; r++) {
        expect(Math.abs(woodGrainFor(f + r).drift)).toBeLessThanOrEqual(0.018);
      }
    }
  });

  it('does not correlate figure with shade', () => {
    // seed and drift come from different slices of the hash; if they were
    // taken from the same one, the palest squares would all share a figure.
    const all = [...'abcdefgh'].flatMap(f =>
      [1, 2, 3, 4, 5, 6, 7, 8].map(r => woodGrainFor(f + r)),
    );
    const bySeed = [...all].sort((a, b) => a.seed - b.seed).map(g => g.drift);
    const half = Math.floor(bySeed.length / 2);
    const lo = bySeed.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const hi = bySeed.slice(half).reduce((a, b) => a + b, 0) / half;
    expect(Math.abs(lo - hi)).toBeLessThan(0.006);
  });
});

describe('woodRail', () => {
  it('is a self-contained data URI that fetches nothing', () => {
    const rail = woodRail('#583823');
    expect(rail.startsWith("url('data:image/svg+xml,")).toBe(true);
    // The one http: in there is the SVG namespace, which is an identifier
    // and is never resolved. What would be a real fetch is a reference:
    // href, xlink:href, src, or a url() pointing off the document.
    const svg = decodeURIComponent(rail.slice("url('data:image/svg+xml,".length, -2));
    expect(svg).not.toMatch(/(?:xlink:)?href\s*=/);
    expect(svg).not.toMatch(/\bsrc\s*=/);
    expect(svg).not.toMatch(/url\(\s*['"]?https?:/i);
    expect(svg.match(/https?:/g)).toEqual(['http:']); // the xmlns, and only it
  });

  it('quotes with single quotes so an HTML style attribute survives it', () => {
    // A double quote here terminates the attribute in the demo pages and
    // the whole background-image declaration is silently dropped.
    expect(woodRail('#583823')).not.toContain('"');
  });

  it('carries no raw # — an unescaped fragment truncates the URI', () => {
    expect(woodRail('#583823').slice(24)).not.toContain('#');
  });

  it('varies with the seed', () => {
    expect(woodRail('#583823', 11)).not.toBe(woodRail('#583823', 23));
  });
});

describe('isWoodTheme / shiftHex', () => {
  it('knows the wood themes', () => {
    expect(isWoodTheme('walnut')).toBe(true);
    expect(isWoodTheme('blue')).toBe(false);
  });

  it('mixes toward black and white', () => {
    expect(shiftHex('#808080', 0.5)).toBe('#404040');
    expect(shiftHex('#808080', -0.5)).toBe('#c0c0c0');
    expect(shiftHex('nope', 0.5)).toBe('nope');
  });
});
