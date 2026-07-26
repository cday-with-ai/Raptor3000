import type { ChatEventParser } from './ChatEventParser.js';
import type { GameLineParsers, ChunkParsers } from './FicsParser.js';

import { PartnerTellEventParser } from './chat/PartnerTellEventParser.js';
import { ToldEventParser } from './chat/ToldEventParser.js';
import { ChannelTellEventParser } from './chat/ChannelTellEventParser.js';
import { CshoutEventParser } from './chat/CshoutEventParser.js';
import { ShoutEventParser } from './chat/ShoutEventParser.js';
import { KibitzEventParser } from './chat/KibitzEventParser.js';
import { TellEventParser } from './chat/TellEventParser.js';
import { WhisperEventParser } from './chat/WhisperEventParser.js';
import { QTellParser } from './chat/QTellParser.js';
import { ChallengeEventParser } from './chat/ChallengeEventParser.js';
import { PartnershipCreatedEventParser } from './chat/PartnershipCreatedEventParser.js';
import { PartnershipEndedEventParser } from './chat/PartnershipEndedEventParser.js';
import { FollowingEventParser } from './chat/FollowingEventParser.js';
import { DrawOfferedEventParser } from './chat/DrawOfferedEventParser.js';
import { AbortRequestedEventParser } from './chat/AbortRequestedEventParser.js';
import { HistoryEventParser } from './chat/HistoryEventParser.js';
import { JournalEventParser } from './chat/JournalEventParser.js';
import { FingerEventParser } from './chat/FingerEventParser.js';
import { BugWhoAllEventParser } from './chat/BugWhoAllEventParser.js';
import { NotificationEventParser } from './chat/NotificationEventParser.js';
import { VariablesEventParser } from './chat/VariablesEventParser.js';
import { PingEventParser } from './chat/PingEventParser.js';

import { Style12Parser } from './game/Style12Parser.js';
import { G1Parser } from './game/G1Parser.js';
import { B1Parser } from './game/B1Parser.js';
import { GameEndParser } from './game/GameEndParser.js';
import { IllegalMoveParser } from './game/IllegalMoveParser.js';
import { NoLongerExaminingGameParser } from './game/NoLongerExaminingGameParser.js';
import { RemovingObsGameParser } from './game/RemovingObsGameParser.js';
import { TakebackParser } from './game/TakebackParser.js';
import { SoughtParser } from './game/SoughtParser.js';
import { GameInfoParser } from './game/GameInfoParser.js';
import { MovesParser } from './game/MovesParser.js';

/**
 * Default parser chain in priority order.
 *
 * Order is identical to Raptor's IcsParser.java (lines 172-195) — do not
 * reorder without a good reason. Narrower/more-specific patterns come
 * before broader ones (e.g. PartnerTell before Told before ChannelTell).
 */
export function defaultChatParsers(): ChatEventParser[] {
  return [
    new PartnerTellEventParser(),
    new ToldEventParser(),
    new ChannelTellEventParser(),
    new CshoutEventParser(),
    new ShoutEventParser(),
    new KibitzEventParser(),
    new TellEventParser(),
    new WhisperEventParser(),
    new QTellParser(),
    new ChallengeEventParser(),
    new PartnershipCreatedEventParser(),
    new PartnershipEndedEventParser(),
    new FollowingEventParser(),
    new DrawOfferedEventParser(),
    new AbortRequestedEventParser(),
    new HistoryEventParser(),
    new JournalEventParser(),
    new FingerEventParser(),
    new BugWhoAllEventParser(),
    new NotificationEventParser(),
    new VariablesEventParser(),
    new PingEventParser(),
  ];
}

/**
 * Default per-line game-message parsers. Each returns a strongly-typed
 * message POJO or null. `TakebackParser` is stateful across calls, so a
 * fresh instance is created here — don't share one across FicsParsers.
 */
export function defaultGameLineParsers(): GameLineParsers {
  return {
    g1: new G1Parser(),
    style12: new Style12Parser(),
    b1: new B1Parser(),
    gameEnd: new GameEndParser(),
    illegalMove: new IllegalMoveParser(),
    removingObs: new RemovingObsGameParser(),
    noLongerExamining: new NoLongerExaminingGameParser(),
    takeback: new TakebackParser(),
  };
}

/**
 * Default whole-chunk parsers (moves / sought / games). `bugWhoAll` is
 * left undefined — the existing chat-chain `BugWhoAllEventParser` still
 * handles that block.
 */
export function defaultChunkParsers(): ChunkParsers {
  return {
    moves: new MovesParser(),
    sought: new SoughtParser(),
    gameInfo: new GameInfoParser(),
  };
}
