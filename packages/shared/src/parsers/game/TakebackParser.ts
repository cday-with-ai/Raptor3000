import type { GameMessageParser } from '../FicsParser.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * Takeback-request tracker. Direct port of Raptor's
 * `TakebackParser.java` (BSD).
 *
 * This parser is unusual: it is stateful across calls. A takeback offer
 * is buffered per-gameId, and a subsequent "accepts the takeback
 * request" line flips the `wasAccepted` flag. Consumers call
 * `getTakebackMessage(gameId)` after a `GAME_STATE_CHANGED` to decide
 * whether to roll back the game tree.
 *
 * Examples:
 *   Game 117: raptorb requests to take back 1 half move(s).
 *   Game 117: raptora accepts the takeback request.
 *   You accept the takeback request from raptorb.
 */
export interface TakebackState {
  gameId: string;
  halfMovesRequested: number;
  wasAccepted: boolean;
}

export class TakebackParser implements GameMessageParser<TakebackState> {
  readonly name = 'TakebackParser';
  static readonly IDENTIFIER = 'Game';
  static readonly REQUEST_TAKE_BACK = 'would like to take back';
  static readonly ACCEPTED_TAKE_BACK = 'accepts the takeback request';
  static readonly YOU_ACCEPTED_TAKE_BACK =
    'You accept the takeback request from';

  private readonly state = new Map<string, TakebackState>();

  getTakebackMessage(gameId: string): TakebackState | undefined {
    return this.state.get(gameId);
  }

  clearTakebackMessages(gameId: string): void {
    this.state.delete(gameId);
  }

  /**
   * Returns the takeback state produced by this line, or `null` if the
   * line isn't a takeback line. Matches Raptor's behavior: a request
   * stores state and returns the buffered state (so wiring can fire an
   * `OFFER_RECEIVED` event); an accept flips the flag and returns that
   * state.
   */
  parse(line: string): TakebackState | null {
    // Raptor's constant says "would like to take back" but real FICS
    // output uses "requests to take back" (see the sample line in the
    // Java source's own comment). Accept both and extract the halfmove
    // count via regex — insensitive to filler-word count.
    if (
      line.startsWith(TakebackParser.IDENTIFIER) &&
      (line.includes(TakebackParser.REQUEST_TAKE_BACK) ||
        line.includes('requests to take back'))
    ) {
      const match = /^Game (\d+):.*take back (\d+) half/.exec(line);
      if (!match) return null;
      const gameId = match[1];
      const halfMovesRequested = parseInt(match[2], 10);
      const msg: TakebackState = { gameId, halfMovesRequested, wasAccepted: false };
      this.state.set(gameId, msg);
      return msg;
    }

    const isAcceptedByOther =
      line.startsWith(TakebackParser.IDENTIFIER) &&
      line.includes(TakebackParser.ACCEPTED_TAKE_BACK);
    const isAcceptedByUser = line.startsWith(
      TakebackParser.YOU_ACCEPTED_TAKE_BACK,
    );
    if (isAcceptedByOther || isAcceptedByUser) {
      const tok = new RaptorTokenizer(line, ' ');
      tok.nextToken();                     // Game | You
      let gameId = tok.nextToken();        // 117: | accept
      gameId = gameId.substring(0, gameId.length - 1);
      let msg = this.state.get(gameId);
      if (msg) {
        msg = { ...msg, wasAccepted: true };
      } else {
        // Raptor: record a takeback we never saw the request for.
        // `halfMovesRequested = -1` signals this to callers.
        msg = { gameId, halfMovesRequested: -1, wasAccepted: true };
      }
      this.state.set(gameId, msg);
      return msg;
    }

    return null;
  }
}
