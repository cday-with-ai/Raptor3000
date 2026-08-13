import type { Style12Message } from './Style12Message.js';

/**
 * Response to the `moves` command — full game move history.
 * Parity with raptor/connector/ics/game/message/MovesMessage.java.
 */
export interface MovesMessage {
  readonly gameId: string;
  readonly moves: readonly string[];
  readonly timePerMove: readonly number[];
  /**
   * Final Style12 from the moves response, or null if the game didn't
   * include a startpos (the `<12>` block is only emitted when the
   * `startpos` ivariable is set and the variant requires it).
   */
  readonly style12: Style12Message | null;
  readonly gameType: string;
  /** From the header's "Rated/Unrated <variant> match" line; null when
   *  the header didn't parse. These survive game end (G1 does not), so
   *  the status flavor — "Lightning 1 0 u" — stays complete on
   *  inactive boards. */
  readonly isRated: boolean | null;
  readonly initialMinutes: number | null;
  readonly incrementSeconds: number | null;
  /** From the header line `laikun (2106) vs. zabakov (2021) --- …`.
   *  Empty string when the header shows no digits (guests, UNR). */
  readonly whiteRating: string;
  readonly blackRating: string;
}
