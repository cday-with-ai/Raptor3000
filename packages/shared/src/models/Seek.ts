/**
 * Seek record from the `sought` command. Parity with
 * raptor/chat/Seek.java.
 */

export const SeekColor = {
  WHITE: 'white',
  BLACK: 'black',
  AUTO: 'auto',
} as const;
export type SeekColorCode = (typeof SeekColor)[keyof typeof SeekColor];

export const SeekType = {
  BLITZ: 'blitz',
  LIGHTNING: 'lightning',
  STANDARD: 'standard',
  CRAZYHOUSE: 'crazyhouse',
  BUGHOUSE: 'bughouse',
  WILD: 'wild',
  SUICIDE: 'suicide',
  LOSERS: 'losers',
  ATOMIC: 'atomic',
  FISCHER_RANDOM: 'fischerRandom',
  UNTIMED: 'untimed',
  OTHER: 'other',
} as const;
export type SeekTypeCode = (typeof SeekType)[keyof typeof SeekType];

export interface Seek {
  /** Ad number — the integer handle used by `play <n>`. */
  readonly ad: string;
  readonly name: string;
  /** Rating string, or `----` for unrated / provisional. */
  readonly rating: string;
  readonly minutes: number;
  readonly increment: number;
  readonly rated: boolean;
  readonly typeDescription: string;
  readonly type: SeekTypeCode;
  readonly color: SeekColorCode;
  readonly minRating: number;
  readonly maxRating: number;
  readonly manual: boolean;
  readonly formula: boolean;
}
