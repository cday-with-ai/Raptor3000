import type { ChunkParser } from '../FicsParser.js';
import type { MovesMessage } from '../../models/messages/MovesMessage.js';
import type { Style12Message } from '../../models/messages/Style12Message.js';
import { Style12Parser } from './Style12Parser.js';
import { RaptorTokenizer, timeToLong } from './tokenizer.js';

/**
 * `moves` command response. Direct port of Raptor's `MovesParser.java`
 * (BSD). The block is eaten whole by `FicsParser.parseMovesMessage`
 * before per-line game-event parsing runs.
 *
 * Shape:
 *   \nMovelist for game N:
 *   whitename (E) vs. blackname (E) --- <date>
 *   <Un>rated <variant> match, initial time: T minutes, increment: I seconds.
 *   [<12> ... if iv startpos is set and variant requires it]
 *   Move  whitename           blackname
 *   ---   ----------------    ----------------
 *   1.  d4 (0:00.000) Nf6 (0:00.000)
 *   ...
 *   {Still in progress} | {<result>} <score>
 */
export class MovesParser implements ChunkParser<MovesMessage> {
  readonly name = 'MovesParser';
  static readonly EVENT_START = '\nMovelist for game ';
  static readonly EVENT_START_2 = 'fics% \nMovelist for game ';

  private readonly style12Parser = new Style12Parser();

  parse(input: string): MovesMessage | null {
    const startsWithEventStart = input.startsWith(MovesParser.EVENT_START);
    if (!startsWithEventStart && !input.startsWith(MovesParser.EVENT_START_2)) {
      return null;
    }
    const prefixLen = startsWithEventStart
      ? MovesParser.EVENT_START.length
      : MovesParser.EVENT_START_2.length;

    const lastDash = input.lastIndexOf('--');
    const firstColon = input.indexOf(':');
    if (lastDash === -1 || firstColon === -1) return null;

    const gameId = input.substring(prefixLen, firstColon);

    let style12: Style12Message | null = null;
    const s12Index = input.indexOf('<12>');
    if (s12Index !== -1) {
      const s12End = input.indexOf('\n', s12Index);
      if (s12End !== -1) {
        style12 = this.style12Parser.parse(input.substring(s12Index, s12End));
      }
    }

    // Assigned in the try below; the catch returns, so it is always set by the
    // time it is read. No useless '' initialiser (no-useless-assignment).
    let gameType: string;
    let whiteRating = '';
    let blackRating = '';
    let isRated: boolean | null = null;
    let initialMinutes: number | null = null;
    let incrementSeconds: number | null = null;
    try {
      const headerTok = new RaptorTokenizer(input.substring(firstColon), '\n');
      headerTok.nextToken();                     // ":"
      const vsLine = headerTok.nextToken();      // "white (E) vs. black (E) --- <date>"
      // Ratings ride the vs line (2026-08-12): the one source that covers
      // observing, playing AND examined stored games — every board window
      // requests `moves` on open. Digits only; (++++)/(UNR) stay ''.
      const vs = /\((\d+)\)[^(]*vs\.?[^(]*\((\d+)\)/.exec(vsLine);
      if (vs) {
        whiteRating = vs[1];
        blackRating = vs[2];
      }
      const descLine = headerTok.nextToken();    // "Rated <variant> match, initial..."
      const descTok = new RaptorTokenizer(descLine, ' ');
      const ratedness = descTok.nextToken();     // Rated | Unrated
      gameType = descTok.nextToken();            // variant
      // Ratedness + clocks ride the same line — kept for the status
      // flavor, which must survive the G1 wipe at game end.
      if (/^rated$/i.test(ratedness)) isRated = true;
      else if (/^unrated$/i.test(ratedness)) isRated = false;
      const clocks = /initial time:\s*(\d+)\s*minutes?,\s*increment:\s*(\d+)/i.exec(descLine);
      if (clocks) {
        initialMinutes = parseInt(clocks[1], 10);
        incrementSeconds = parseInt(clocks[2], 10);
      }
    } catch {
      return null;
    }

    const moves: string[] = [];
    const timePerMove: number[] = [];

    const afterDash = input.substring(lastDash);
    const lineTok = new RaptorTokenizer(afterDash, '\n');
    try {
      lineTok.nextToken(); // consume the "----   -------- --------" separator
    } catch {
      return null;
    }

    while (lineTok.hasMoreTokens()) {
      const line = lineTok.nextToken();
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) break;

      const tok = new RaptorTokenizer(line, ' ');

      try {
        if (!tok.hasMoreTokens()) continue;
        tok.nextToken();                         // move number "1."

        if (!tok.hasMoreTokens()) continue;
        let token = tok.nextToken();
        if (token !== '...') {
          moves.push(token);
          if (tok.hasMoreTokens()) {
            timePerMove.push(timeToLong(tok.nextToken()));
          }
        } else if (tok.hasMoreTokens()) {
          tok.nextToken();
        }

        if (!tok.hasMoreTokens()) continue;
        token = tok.nextToken();
        if (token !== '...') {
          moves.push(token);
          if (tok.hasMoreTokens()) {
            timePerMove.push(timeToLong(tok.nextToken()));
          }
        } else if (tok.hasMoreTokens()) {
          tok.nextToken();
        }
      } catch {
        // Malformed move line — skip it.
      }
    }

    return {
      gameId,
      moves,
      timePerMove,
      style12,
      gameType,
      isRated,
      initialMinutes,
      incrementSeconds,
      whiteRating,
      blackRating,
    };
  }
}
