/**
 * Summary row from the FICS `games` command. Direct parity with
 * raptor/service/GameService.java nested `GameInfo` + `GameInfoCategory`.
 *
 * Note: this replaces the simpler `GameInfo` that used to live in
 * Offer.ts — GameInfoParser fills these exact fields, so matching
 * Raptor's POJO saves a translation layer.
 */

export const GameInfoCategory = {
  BLITZ: 'blitz',
  LIGHTNING: 'lightning',
  UNTIMED: 'untimed',
  EXAMINED: 'examined',
  STANDARD: 'standard',
  WILD: 'wild',
  ATOMIC: 'atomic',
  CRAZYHOUSE: 'crazyhouse',
  BUGHOUSE: 'bughouse',
  LOSERS: 'losers',
  SUICIDE: 'suicide',
  NONSTANDARD: 'nonstandard',
} as const;
export type GameInfoCategoryCode =
  (typeof GameInfoCategory)[keyof typeof GameInfoCategory];

export interface GameInfo {
  readonly id: string;
  readonly whiteName: string;
  readonly blackName: string;
  readonly whiteElo: string;
  readonly blackElo: string;
  /** Initial time in minutes. */
  readonly time: number;
  /** Increment in seconds. */
  readonly inc: number;
  readonly category: GameInfoCategoryCode;
  readonly isPrivate: boolean;
  readonly isRated: boolean;
  readonly beingExamined: boolean;
  /** True if it's white's move. */
  readonly whitesMove: boolean;
  readonly moveNumber: number;
}
