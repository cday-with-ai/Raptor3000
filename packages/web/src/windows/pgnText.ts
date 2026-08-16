/**
 * The PGN text builder — lichess/babaschess header flavor, one
 * `[Tag "value"]` per line, movetext wrapped to the PGN spec's 75-char
 * lines. Shared by the Save PGN button and the auto-append journal, so
 * the two can never drift apart (BOTCHvinik, 2026-08-16).
 *
 * Deliberately breaks with original Raptor's writer (Carson,
 * 2026-08-16) — its headers ("3 0 unrated blitz", ResultDescription)
 * are the ones other tools don't read.
 *
 * Movetext from the window-local history; Result/Termination from the
 * window's gameEnd (played, observed and examined games all get one);
 * Opening/ECO from the lichess openings table; Variant only when the
 * game is not standard chess.
 */

import type { RaptorContext } from './appContext.js';
import type { Opening } from '../game/openings.js';
import {
  GameEndType,
  type GameEndMessage,
  type Style12Message,
} from '@raptor3000/shared';

export interface PgnTextArgs {
  context: RaptorContext;
  gameId: string | null;
  s12: Style12Message | undefined;
  sans: ReadonlyMap<number, string>;
  gameEnd: GameEndMessage | null;
  opening: Opening | null;
  whiteRating: string;
  blackRating: string;
}

export function buildPgnText(args: PgnTextArgs): string {
  const { context, gameId, s12, sans, gameEnd, opening, whiteRating, blackRating } = args;
  const moves: string[] = [];
  for (let p = 1; sans.has(p); p++) {
    if (p % 2 === 1) moves.push(`${(p + 1) / 2}.`);
    moves.push(sans.get(p)!);
  }

  const today = new Date();
  const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const utcDate = `${today.getUTCFullYear()}.${String(today.getUTCMonth() + 1).padStart(2, '0')}.${String(today.getUTCDate()).padStart(2, '0')}`;
  const utcTime = `${String(today.getUTCHours()).padStart(2, '0')}:${String(today.getUTCMinutes()).padStart(2, '0')}:${String(today.getUTCSeconds()).padStart(2, '0')}`;

  // The variant rides the same type string as the status flavor: <g1>
  // when it survived the game end, else the `moves` header. FICS names:
  // blitz, standard, wild/fr, wild/0 (crazyhouse), suicide, atomic, ...
  const g1 = gameId ? context.gameService.getLatestG1(gameId) : undefined;
  const mm = gameId ? context.gameService.getLatestMoves(gameId) : undefined;
  const gameType = g1?.gameTypeDescription ?? mm?.gameType;

  // Time control: <g1>/Style12 carry ms; the moves header carries
  // minutes+seconds. Written seconds+seconds, "120+12", like lichess.
  let tc: string | null = null;
  if (s12) {
    tc = `${Math.round(s12.initialTimeMillis / 1000)}+${Math.round(s12.initialIncMillis / 1000)}`;
  } else if (mm?.initialMinutes != null) {
    tc = `${mm.initialMinutes}+${mm.incrementSeconds ?? 0}`;
  }

  const result = pgnResult(gameEnd);
  const variant = variantFor(gameType);
  const headers = [
    '[Event "Online Game"]',
    '[Site "https://freechess.org"]',
    `[Date "${date}"]`,
    '[Round "-"]',
    `[White "${s12?.whiteName ?? '?'}"]`,
    `[Black "${s12?.blackName ?? '?'}"]`,
    `[Result "${result}"]`,
    tc ? `[TimeControl "${tc}"]` : null,
    `[WhiteElo "${whiteRating || '-'}"]`,
    `[BlackElo "${blackRating || '-'}"]`,
    variant ? `[Variant "${variant}"]` : null,
    `[UTCDate "${utcDate}"]`,
    `[UTCTime "${utcTime}"]`,
    opening ? `[Opening "${opening.name}"]` : null,
    opening ? `[ECO "${opening.eco}"]` : null,
    gameEnd ? `[Termination "${pgnTermination(gameEnd)}"]` : null,
  ].filter((h): h is string => h !== null);

  const movetext = wrapPgnMoves([...moves, result]);
  return [...headers, '', movetext, ''].join('\n');
}

/** `1-0`, `0-1`, `1/2-1/2`, `*` — the PGN spec's result tokens. */
export function pgnResult(ge: GameEndMessage | null): string {
  if (!ge) return '*';
  switch (ge.type) {
    case GameEndType.WHITE_WON: return '1-0';
    case GameEndType.BLACK_WON: return '0-1';
    case GameEndType.DRAW: return '1/2-1/2';
    default: return '*';
  }
}

/**
 * The lichess Termination vocabulary, inferred from FICS's end
 * description ("Black resigns" → resignation, "Black forfeits by
 * timeout" → time forfeit, "Game drawn by repetition" → repetition...).
 * Descriptions are free text, so this is keyword matching with the
 * specific phrases first — "stalemate" before "mate", since the latter
 * is a substring of the former. Extracted verbatim from BoardWindow,
 * 2026-08-16.
 */
export function pgnTermination(ge: GameEndMessage): string {
  if (ge.type === GameEndType.ABORTED) return 'abandoned';
  if (ge.type === GameEndType.ADJOURNED) return 'adjourned';
  if (ge.type === GameEndType.UNDETERMINED) return 'unterminated';
  const d = ge.description.toLowerCase();
  if (d.includes('stalemate')) return 'stalemate';
  if (d.includes('checkmate') || d.includes('mates')) return 'checkmate';
  if (d.includes('resign')) return 'resignation';
  if (d.includes('forfeit') || d.includes('time')) return 'time forfeit';
  if (d.includes('repetition')) return 'repetition';
  if (d.includes('insufficient')) return 'insufficient material';
  if (d.includes('agreement') || d.includes('offered')) return 'agreement';
  if (d.includes('50') || d.includes('fifty')) return '50 move rule';
  return 'normal';
}

/** FICS game types → PGN Variant names. Unknown types (including plain
 *  "standard"/"blitz") yield null, so standard games get no Variant tag
 *  at all — that is the PGN default. Extracted verbatim from
 *  BoardWindow, 2026-08-16. */
export function variantFor(type: string | undefined): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('wild/fr') || t.includes('fischer')) return 'Chess960';
  if (t.includes('crazyhouse') || t.includes('zh') || t.includes('wild/0')) return 'Crazyhouse';
  if (t.includes('suicide') || t.includes('losers') || t.includes('giveaway') || t.includes('wild/1') || t.includes('wild/2') || t.includes('wild/3')) return 'Antichess';
  if (t.includes('atomic') || t.includes('wild/4')) return 'Atomic';
  if (t.includes('bughouse')) return 'Bughouse';
  return null;
}

/** PGN spec (Appendix C): wrap lines at 75 chars, breaking between
 *  tokens. Leading move numbers ride with the following move. */
export function wrapPgnMoves(tokens: string[]): string {
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    const candidate = line ? `${line} ${token}` : token;
    if (candidate.length > 75 && line) {
      lines.push(line);
      line = token;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}