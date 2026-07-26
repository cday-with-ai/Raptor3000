/**
 * Canonical taxonomy of chat events, at exact parity with Raptor's
 * `raptor/chat/ChatType.java` enum. Values and names match the Java source;
 * javadoc comments are preserved verbatim for each value.
 *
 * The taxonomy itself — every enum value here — originated in the Raptor
 * project (https://github.com/fbergo/Raptor, 2005-2016, BSD license).
 * Any corrections should be verified against that source first.
 *
 * Each incoming FICS line is classified into exactly one of these types by
 * the parser registry. Keep this list flat and stable — it's the contract
 * between parsers and tab stores.
 */
export enum ChatEventType {
  ALL = 'ALL',

  /** Message sent when someone challenges you to a match. */
  CHALLENGE = 'CHALLENGE',

  /** Channel tells. The source will be the person sending the tell. Will always have a channel. */
  CHANNEL_TELL = 'CHANNEL_TELL',

  /** Global c-shouts. Will always have a source. */
  CSHOUT = 'CSHOUT',

  /** Message sent when you are following a persons games. Source will be the person you are following. */
  FOLLOWING = 'FOLLOWING',

  /** Used for messages sent from within Raptor. Error messages and informational messages. */
  INTERNAL = 'INTERNAL',

  /** Kibitzes pertaining to a game. Will always have a game id set and a source. */
  KIBITZ = 'KIBITZ',

  /** Used for a message containing a game moves list. */
  MOVES = 'MOVES',

  /** Message sent when you are no longer following a persons games. */
  NOT_FOLLOWING = 'NOT_FOLLOWING',

  /** Used for messages sent to a connector. */
  OUTBOUND = 'OUTBOUND',

  /** Tells from a bughouse partner. Source will be the partners name. */
  PARTNER_TELL = 'PARTNER_TELL',

  /** Message pertaining to a bughouse partnership being created. Source will be the name of the partner. */
  PARTNERSHIP_CREATED = 'PARTNERSHIP_CREATED',

  /** Message pertaining to a bughouse partnership being destroyed. */
  PARTNERSHIP_DESTROYED = 'PARTNERSHIP_DESTROYED',

  /** Global shouts. Will always have a source. */
  SHOUT = 'SHOUT',

  /** Used for direct tells and say. Source will be the person sending the tell. */
  TELL = 'TELL',

  /** Used for the told message after a tell. Source will be the person told. */
  TOLD = 'TOLD',

  /** Used to identify types that don't match any of the others. */
  UNKNOWN = 'UNKNOWN',

  /** Whispers pertaining to a game. Will always have a source and a game id. */
  WHISPER = 'WHISPER',

  /** A message indicating this is a bugwho unpartnered buggers message. */
  BUGWHO_UNPARTNERED_BUGGERS = 'BUGWHO_UNPARTNERED_BUGGERS',

  /** A message indicating this is an available teams bugger message. */
  BUGWHO_AVAILABLE_TEAMS = 'BUGWHO_AVAILABLE_TEAMS',

  /** A message indicating this is a bughouse games message. */
  BUGWHO_GAMES = 'BUGWHO_GAMES',

  /** A message indicating this is a message containing seeks. */
  SEEKS = 'SEEKS',

  /** A message indicating an abort request. */
  ABORT_REQUEST = 'ABORT_REQUEST',

  /** A message indicating a draw offer. */
  DRAW_REQUEST = 'DRAW_REQUEST',

  /** Bots can send QTells. These are tells that start with the ':' character. These messages never contain a source. */
  QTELL = 'QTELL',

  /** An internal message containing statistics after you finish playing a game. */
  PLAYING_STATISTICS = 'PLAYING_STATISTICS',

  /** A message containing finger notes. Source contains the user whose finger it is. (fics: finger) */
  FINGER = 'FINGER',

  /** A message containing recent game history. Source contains the user whose history it is. (fics: history) */
  HISTORY = 'HISTORY',

  /** A message containing game journal entries. Source contains the user whose journal it is. (fics: journal) */
  JOURNAL = 'JOURNAL',

  /** A message containing games. (fics: games) */
  GAMES = 'GAMES',

  /** A message containing the full bugwho output. (fics: bugwho) */
  BUGWHO_ALL = 'BUGWHO_ALL',

  /** Notification message, source is the user arriving. */
  NOTIFICATION_ARRIVAL = 'NOTIFICATION_ARRIVAL',

  /** Notification message, source is the user departing. */
  NOTIFICATION_DEPARTURE = 'NOTIFICATION_DEPARTURE',

  /** A message that displays a user variables (fics: variables) */
  VARIABLES = 'VARIABLES',

  PING_RESPONSE = 'PING_RESPONSE',
}

/**
 * Category grouping for UI purposes (e.g. filtering, coloring, tab routing).
 * Not part of Raptor's source — a TS-side convenience for tab store logic.
 */
export enum ChatEventCategory {
  DIRECTED,   // tell/partner/qtell/told
  CHANNEL,    // channel_tell
  BROADCAST,  // shout/cshout
  GAME_CHAT,  // kibitz/whisper
  SOCIAL,     // challenges, partnership, notifications, following, offers
  INFO_DUMP,  // finger/history/games/seeks/bugwho/moves/variables/stats
  META,       // internal/outbound/unknown/all/ping
}

export function categoryOf(type: ChatEventType): ChatEventCategory {
  switch (type) {
    case ChatEventType.TELL:
    case ChatEventType.PARTNER_TELL:
    case ChatEventType.QTELL:
    case ChatEventType.TOLD:
      return ChatEventCategory.DIRECTED;
    case ChatEventType.CHANNEL_TELL:
      return ChatEventCategory.CHANNEL;
    case ChatEventType.SHOUT:
    case ChatEventType.CSHOUT:
      return ChatEventCategory.BROADCAST;
    case ChatEventType.KIBITZ:
    case ChatEventType.WHISPER:
      return ChatEventCategory.GAME_CHAT;
    case ChatEventType.CHALLENGE:
    case ChatEventType.DRAW_REQUEST:
    case ChatEventType.ABORT_REQUEST:
    case ChatEventType.FOLLOWING:
    case ChatEventType.NOT_FOLLOWING:
    case ChatEventType.PARTNERSHIP_CREATED:
    case ChatEventType.PARTNERSHIP_DESTROYED:
    case ChatEventType.NOTIFICATION_ARRIVAL:
    case ChatEventType.NOTIFICATION_DEPARTURE:
      return ChatEventCategory.SOCIAL;
    case ChatEventType.FINGER:
    case ChatEventType.HISTORY:
    case ChatEventType.JOURNAL:
    case ChatEventType.GAMES:
    case ChatEventType.SEEKS:
    case ChatEventType.BUGWHO_GAMES:
    case ChatEventType.BUGWHO_AVAILABLE_TEAMS:
    case ChatEventType.BUGWHO_UNPARTNERED_BUGGERS:
    case ChatEventType.BUGWHO_ALL:
    case ChatEventType.MOVES:
    case ChatEventType.VARIABLES:
    case ChatEventType.PLAYING_STATISTICS:
      return ChatEventCategory.INFO_DUMP;
    default:
      return ChatEventCategory.META;
  }
}
