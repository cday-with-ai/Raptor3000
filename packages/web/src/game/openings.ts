/**
 * Opening detection against lichess's chess-openings dataset — the
 * canonical open ECO catalogue (~3,800 named lines, CC0, actively
 * curated; it is what lichess itself displays).
 *
 * Freshness by design (Carson, 2026-08-12): the TSVs are fetched from
 * the dataset's GitHub at runtime, so the names are always current —
 * no baked snapshot to rot. `public/openings.json` (baked from the
 * same TSVs) is only the fallback for offline / GitHub-unreachable,
 * and documents the parsed shape.
 *
 * Detection is a longest-prefix match on the window-local SAN history:
 * the deepest catalogued line the game has followed names the opening,
 * and once the game leaves book the last match stands — standard
 * behavior everywhere.
 */

export interface Opening {
  eco: string;
  name: string;
  /** How many plies of the game the matched line covers. */
  plies: number;
}

interface OpeningTable {
  maxPlies: number;
  /** normalized "e4 c5 Nf3" → [eco, name] */
  openings: ReadonlyMap<string, readonly [string, string]>;
}

const UPSTREAM = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master';
const FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

/** Strip check/mate marks and annotations — FICS SAN and dataset PGN
 *  differ only in this decoration. */
function normalizeSan(san: string): string {
  return san.replace(/[?!]+$/, '').replace(/[+#]+$/, '');
}

function parseTsv(text: string, into: Map<string, readonly [string, string]>): number {
  let maxPlies = 0;
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('eco\t')) continue;
    const [eco, name, pgn] = line.split('\t');
    if (!pgn) continue;
    const sans = pgn
      .split(/\s+/)
      .filter(t => !/^\d+\.$/.test(t))
      .map(normalizeSan);
    into.set(sans.join(' '), [eco, name]);
    if (sans.length > maxPlies) maxPlies = sans.length;
  }
  return maxPlies;
}

let tablePromise: Promise<OpeningTable> | null = null;

async function fetchUpstream(): Promise<OpeningTable> {
  const texts = await Promise.all(
    FILES.map(async f => {
      const res = await fetch(`${UPSTREAM}/${f}`);
      if (!res.ok) throw new Error(`${f}: ${res.status}`);
      return res.text();
    }),
  );
  const openings = new Map<string, readonly [string, string]>();
  let maxPlies = 0;
  for (const t of texts) maxPlies = Math.max(maxPlies, parseTsv(t, openings));
  if (openings.size === 0) throw new Error('empty dataset');
  return { maxPlies, openings };
}

async function fetchFallback(): Promise<OpeningTable> {
  const res = await fetch('/openings.json');
  const data = (await res.json()) as {
    maxPlies: number;
    openings: Record<string, [string, string]>;
  };
  return { maxPlies: data.maxPlies, openings: new Map(Object.entries(data.openings)) };
}

/** The table, loaded once per window and shared by every consumer. */
export function loadOpenings(): Promise<OpeningTable> {
  if (!tablePromise) {
    tablePromise = fetchUpstream().catch(() => fetchFallback());
  }
  return tablePromise;
}

/**
 * Longest catalogued prefix of the game's SAN history, or null while
 * the game is still inside nothing (or before the table loads).
 */
export function detectOpening(
  table: OpeningTable,
  sans: readonly string[],
): Opening | null {
  const limit = Math.min(sans.length, table.maxPlies);
  const normalized = sans.slice(0, limit).map(normalizeSan);
  for (let n = limit; n >= 1; n--) {
    const hit = table.openings.get(normalized.slice(0, n).join(' '));
    if (hit) return { eco: hit[0], name: hit[1], plies: n };
  }
  return null;
}

/** Test seam: parse raw TSV text into a table (no network). */
export function tableFromTsv(text: string): OpeningTable {
  const openings = new Map<string, readonly [string, string]>();
  const maxPlies = parseTsv(text, openings);
  return { maxPlies, openings };
}
