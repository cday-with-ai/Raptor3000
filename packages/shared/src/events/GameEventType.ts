/**
 * Canonical taxonomy of game events, at exact parity with Raptor's
 * `raptor/service/GameService.java` fire* methods (and the corresponding
 * GameServiceListener callbacks).
 *
 * Unlike ChatEventType (which is a flat enum of message categories), these
 * are dispatcher event names. Each value corresponds to one method on the
 * GameServiceListener interface and one fire* emitter on GameService.
 *
 * Source: /tmp/raptor/raptor/src/raptor/service/GameService.java
 */
export enum GameEventType {
  /** A droppable game's piece holdings changed (bughouse/crazyhouse). */
  DROPPABLE_PIECES_CHANGED = 'DROPPABLE_PIECES_CHANGED',

  /** An examined game transitioned to setup mode (user is placing pieces). */
  EXAMINED_GAME_BECAME_SETUP = 'EXAMINED_GAME_BECAME_SETUP',

  /** A new game object was created in the registry. */
  GAME_CREATED = 'GAME_CREATED',

  /** A game is no longer active (ended, unobserved, etc). */
  GAME_INACTIVE = 'GAME_INACTIVE',

  /** The list of public games changed (fics: games command output changed). */
  GAME_INFO_CHANGED = 'GAME_INFO_CHANGED',

  /** The move history of a game was (re)populated, e.g. response to `moves`. */
  GAME_MOVES_ADDED = 'GAME_MOVES_ADDED',

  /**
   * Game state changed. Sent on every Style12 update: moves, clock,
   * takebacks, castling status. Carries an `isNewMove` flag so listeners
   * can distinguish move-made from clock-only updates.
   */
  GAME_STATE_CHANGED = 'GAME_STATE_CHANGED',

  /** Server rejected a move as illegal. */
  ILLEGAL_MOVE = 'ILLEGAL_MOVE',

  /** An observed game transitioned to examined (the observer is now examining). */
  OBSERVED_GAME_BECAME_EXAMINED = 'OBSERVED_GAME_BECAME_EXAMINED',

  /** User issued an offer (match/draw/abort/adjourn/partner/takeback). */
  OFFER_ISSUED = 'OFFER_ISSUED',

  /** User received an offer. */
  OFFER_RECEIVED = 'OFFER_RECEIVED',

  /** An offer was removed (accepted, declined, withdrawn, or expired). */
  OFFER_REMOVED = 'OFFER_REMOVED',

  /** Setup game transitioned to examined (user finished placing pieces). */
  SETUP_GAME_BECAME_EXAMINED = 'SETUP_GAME_BECAME_EXAMINED',
}
