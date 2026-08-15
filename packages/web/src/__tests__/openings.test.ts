import { describe, it, expect } from 'vitest';
import { detectOpening, tableFromTsv, splitOpeningName } from '../game/openings.js';

/**
 * Opening detection (2026-08-12): longest-prefix match on the SAN
 * history against the lichess chess-openings dataset. The dataset is
 * fetched from its GitHub at runtime so names never rot; the tests run
 * on a fixture in the same TSV format, plus a shape check on the baked
 * fallback that ships in public/.
 */

const TSV = [
  'eco\tname\tpgn',
  'B20\tSicilian Defense\t1. e4 c5',
  'B23\tSicilian Defense: Closed\t1. e4 c5 2. Nc3',
  'C50\tItalian Game\t1. e4 e5 2. Nf3 Nc6 3. Bc4',
  'A00\tAmar Opening\t1. Nh3',
].join('\n');

const table = tableFromTsv(TSV);

describe('detectOpening', () => {
  it('finds the deepest catalogued line the game followed', () => {
    expect(detectOpening(table, ['e4', 'c5'])).toMatchObject({
      eco: 'B20',
      name: 'Sicilian Defense',
      plies: 2,
    });
    expect(detectOpening(table, ['e4', 'c5', 'Nc3'])).toMatchObject({
      eco: 'B23',
      plies: 3,
    });
  });

  it('keeps the last match after the game leaves book', () => {
    const out = detectOpening(table, ['e4', 'c5', 'Nc3', 'a6', 'g3', 'h5']);
    expect(out?.eco).toBe('B23');
    expect(out?.plies).toBe(3);
  });

  it('normalizes FICS check marks against the catalogue', () => {
    // A line arriving as e4/c5/Nc3+ (decoration) still matches.
    expect(detectOpening(table, ['e4', 'c5', 'Nc3+'])?.eco).toBe('B23');
  });

  it('returns null before any book line matches', () => {
    expect(detectOpening(table, ['a3'])).toBeNull();
    expect(detectOpening(table, [])).toBeNull();
  });

  it('parses maxPlies from the fixture', () => {
    expect(table.maxPlies).toBe(5); // the Italian line
  });
});

describe('the baked fallback', () => {
  it('ships in public/ with the parsed shape and a real size', async () => {
    const { readFileSync } = await import('node:fs');
    const raw = JSON.parse(
      readFileSync(new URL('../../public/openings.json', import.meta.url), 'utf8'),
    ) as { maxPlies: number; openings: Record<string, [string, string]> };
    expect(raw.maxPlies).toBeGreaterThan(20);
    expect(Object.keys(raw.openings).length).toBeGreaterThan(3000);
    expect(raw.openings['e4 c5']).toEqual(['B20', 'Sicilian Defense']);
  });
});

/**
 * Splitting a name into family and variation, for the two-line opening
 * caption (Carson, 2026-08-15). The rule is one line of code and still
 * worth pinning: the catalogue's names carry commas inside the
 * variation, so anything that split on the wrong character would break
 * the long names — which are exactly the ones the second line exists
 * for, and the ones nobody checks because the short ones look fine.
 */
describe('splitOpeningName', () => {
  it('splits family from variation at the first colon', () => {
    expect(splitOpeningName('Sicilian Defense: Najdorf Variation')).toEqual({
      main: 'Sicilian Defense',
      sub: 'Najdorf Variation',
    });
  });

  it('keeps commas inside the variation rather than splitting on them', () => {
    expect(
      splitOpeningName('Sicilian Defense: Najdorf Variation, Poisoned Pawn'),
    ).toEqual({
      main: 'Sicilian Defense',
      sub: 'Najdorf Variation, Poisoned Pawn',
    });
  });

  it('splits only on the FIRST colon, so a third line never appears', () => {
    expect(splitOpeningName('A: B: C')).toEqual({ main: 'A', sub: 'B: C' });
  });

  it('leaves a plain name on one line', () => {
    expect(splitOpeningName('Queens Gambit')).toEqual({
      main: 'Queens Gambit',
      sub: null,
    });
  });

  it('treats a trailing colon as no variation, not an empty line', () => {
    expect(splitOpeningName('Ruy Lopez:')).toEqual({ main: 'Ruy Lopez', sub: null });
    expect(splitOpeningName('Ruy Lopez:   ')).toEqual({ main: 'Ruy Lopez', sub: null });
  });
});
