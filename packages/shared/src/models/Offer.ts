/**
 * Offer model used by OFFER_ISSUED / OFFER_RECEIVED / OFFER_REMOVED
 * game events. Parity with raptor/service/GameService.java's nested Offer
 * type and its OfferType enum.
 */

export enum OfferType {
  MATCH = 'match',
  PARTNER = 'partner',
  DRAW = 'draw',
  ABORT = 'abort',
  ADJOURN = 'adjourn',
  TAKEBACK = 'takeback',
}

export interface Offer {
  /** Unique identifier used for removal. */
  readonly id: string;
  readonly type: OfferType;

  /** Who sent it (may be `null` for server-originated offers). */
  readonly from: string | null;

  /** Who it's directed at. */
  readonly to: string | null;

  /** For game-bound offers (draw/abort/adjourn/takeback), the game id. */
  readonly gameId: string | null;

  /** Additional human-readable text, e.g. match parameters for MATCH offers. */
  readonly description: string;

  /** Time of arrival (ms since epoch). */
  readonly time: number;
}

