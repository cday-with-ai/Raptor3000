import { ChatEventType } from '../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../events/ChatEvent.js';
import type { ChatEventParser } from './ChatEventParser.js';
import type { GameService } from '../services/GameService.js';
import type { Style12Message } from '../models/messages/Style12Message.js';
import type { G1Message } from '../models/messages/G1Message.js';
import type { B1Message } from '../models/messages/B1Message.js';
import type { GameEndMessage } from '../models/messages/GameEndMessage.js';
import type { IllegalMoveMessage } from '../models/messages/IllegalMoveMessage.js';
import type { NoLongerExaminingGameMessage } from '../models/messages/NoLongerExaminingGameMessage.js';
import type { RemovingObsGameMessage } from '../models/messages/RemovingObsGameMessage.js';
import type { MovesMessage } from '../models/messages/MovesMessage.js';
import type { GameInfo } from '../models/GameInfo.js';
import type { Seek } from '../models/Seek.js';

/**
 * Inbound parse orchestrator.
 *
 * This file — and the entire chat-parsing architecture in this project
 * (ChatEventType, ChatEvent, ChatEventParser contract, FicsParser control
 * flow, per-message parser classes, and the priority-ordered parser
 * registry) — is a direct port of the chat parsing system designed and
 * implemented by the Raptor project (https://github.com/fbergo/Raptor,
 * 2005-2016, BSD license). We owe the taxonomy, the parser chain, and
 * the per-line regex heuristics to that codebase. Where Raptor's Java
 * source diverges from this TypeScript port, the Java source is the
 * authoritative reference.
 *
 * Verbatim port of IcsParser.parse() control flow
 * (/tmp/raptor/raptor/src/raptor/connector/ics/IcsParser.java:206).
 *
 * Flow:
 *   1. parseMovesMessage()  — Moves response is big/multi-line and eaten whole.
 *                             If matched, emit MOVES event and return "".
 *   2. parseGameEvents()    — Per-line pass over the chunk; strips game
 *                             messages (G1/Style12/B1/GameEnd/IllegalMove/
 *                             NoLongerExamining/RemovingObs/PendInfo/Takeback/
 *                             Following/setup-mode), fires their GameService
 *                             events, and returns the remaining text.
 *   3. If the remainder is blank or just the prompt → done.
 *   4. processBugWho()       — whole-chunk detection of bugwho output.
 *   5. processSought()       — whole-chunk detection of seek list.
 *   6. processGameInfo()     — whole-chunk detection of public game list.
 *   7. Otherwise, iterate nonGameEventParsers over the WHOLE remaining
 *      chunk. Break on first match.
 *   8. If nothing matched, emit one UNKNOWN event carrying the chunk.
 *
 * Each parse() call returns the events produced by that chunk. Game
 * events are dispatched through GameService as side-effects during the
 * parseGameEvents pass (not returned in the events array).
 */

/** Opaque per-line game-message parser. Each returns a typed message or null. */
export interface GameMessageParser<T> {
  readonly name: string;
  parse(line: string): T | null;
}

/** Whole-chunk parser (bugwho / sought / gameInfo / moves). */
export interface ChunkParser<T> {
  readonly name: string;
  parse(chunk: string): T | null;
}

export interface FicsParserConfig {
  /** Ordered chat parsers (priority = first match wins). */
  chatParsers: ChatEventParser[];
  /** GameService to fire side-effect events into. Optional at scaffolding stage. */
  gameService?: GameService;
  /** Prompt string (e.g. "fics% "). Blank chunks that are just the prompt are suppressed. */
  prompt?: string;
  /** Game-message parsers, checked per line in this order. Optional. */
  gameLineParsers?: GameLineParsers;
  /** Whole-chunk parsers for bugwho/sought/gameInfo/moves. Optional. */
  chunkParsers?: ChunkParsers;
}

export interface GameLineParsers {
  g1?: GameMessageParser<G1Message>;
  style12?: GameMessageParser<Style12Message>;
  b1?: GameMessageParser<B1Message>;
  gameEnd?: GameMessageParser<GameEndMessage>;
  illegalMove?: GameMessageParser<IllegalMoveMessage>;
  removingObs?: GameMessageParser<RemovingObsGameMessage>;
  noLongerExamining?: GameMessageParser<NoLongerExaminingGameMessage>;
  takeback?: GameMessageParser<unknown>;
}

export interface ChunkParsers {
  moves?: ChunkParser<MovesMessage>;
  bugWhoAll?: ChunkParser<unknown>;
  sought?: ChunkParser<Seek[]>;
  gameInfo?: ChunkParser<GameInfo[]>;
}

/**
 * Max size for parseGameEvents to attempt per-line splitting. Raptor used
 * 1000; we raise it to 64 KB because our per-line `startsWith` prefilter
 * is near-free, and bigger chunks (multi-game obs with moves lists) were
 * silently bypassing the filter — letting raw `<12>` lines leak into chat.
 */
const MAX_GAME_MESSAGE = 65_536;

/** Lines beginning with any of these prefixes are considered server-level
 *  game control — they MUST never reach the chat parser chain, even if the
 *  typed parser fails to fully parse their payload. */
// `<sr>` (seek removed) was missing, so every withdrawn seek printed raw into the
// chat view once `iset seekinfo 1` was enabled. `<sn>` is kept but is not a token
// FICS is known to send — it looks like the transposition that lost `<sr>`.
// `<pt>` (pending offer TO someone) leaked into chat on 2026-08-12 when a
// guest match offer went out — same family as <pf>/<pr>, same fate.
const GAME_CONTROL_PREFIXES = ['<12>', '<g1>', '<b1>', '<pf>', '<pr>', '<pt>', '<sc>', '<sr>', '<sn>', '<s>'] as const;

export class FicsParser {
  readonly chatParsers: ChatEventParser[];
  readonly gameService: GameService | undefined;
  readonly prompt: string;
  readonly gameLineParsers: GameLineParsers;
  readonly chunkParsers: ChunkParsers;

  /**
   * Rolling buffer for partial-line content across TCP chunks.
   * parseStream() uses this; parse() is chunk-complete and doesn't touch it.
   */
  private lineBuffer = '';

  constructor(config: FicsParserConfig) {
    this.chatParsers = config.chatParsers;
    this.gameService = config.gameService;
    this.prompt = config.prompt ?? 'fics% ';
    this.gameLineParsers = config.gameLineParsers ?? {};
    this.chunkParsers = config.chunkParsers ?? {};
  }

  getChatParserNames(): readonly string[] {
    return this.chatParsers.map(p => p.name);
  }

  /**
   * Primary entry. Matches Raptor's IcsParser.parse(String). Call with a
   * complete message block (trailing newline OK). For stream use, call
   * parseStream() instead — it handles cross-chunk partial lines.
   */
  parse(inboundMessage: string): ChatEvent[] {
    const events: ChatEvent[] = [];

    // 0. Strip prompt echoes before anything else looks at the text. Raptor
    // does this in IcsConnector.parseMessage (filterTrailingPrompts) *before*
    // calling IcsParser.parse, so every parser downstream sees prompt-free
    // text. Our port called the parser on the raw chunk instead.
    const filtered = this.filterPrompts(inboundMessage);

    // 1. Moves messages are eaten whole.
    const afterMoves = this.parseMovesMessage(filtered, events);
    if (!isNotBlank(afterMoves)) return events;

    // 2. Game events are stripped per-line; remainder continues through chat.
    // `trimEnd` the remainder so regex-based chat parsers aren't tripped by
    // the trailing newline that always survives parseGameEvents' join.
    const afterGameEvents = this.parseGameEvents(afterMoves).replace(/\s+$/, '');
    if (!isNotBlank(afterGameEvents)) return events;
    if (afterGameEvents.trim() === this.prompt.trim()) return events;

    // 2b. Rejoin FICS line wraps. The server hard-wraps long output and
    // marks continuations with `\n\   ` (backslash + three spaces); the
    // wrap can fall mid-word — mid-URL, notoriously — so the marker is
    // removed without inserting anything. Without this, a wrapped tell
    // fails every chat parser (their `$` can't cross the newline) and
    // lands in chat as colorless UNKNOWN text, in pieces.
    const joined = afterGameEvents.replace(/\n\\ {3}/g, '');

    // 3-5. Whole-chunk detectors in priority order.
    const bugwho = this.processBugWho(joined);
    if (bugwho) {
      events.push(bugwho);
      return events;
    }
    const sought = this.processSought(joined);
    if (sought) {
      events.push(sought);
      return events;
    }
    const gameInfo = this.processGameInfo(joined);
    if (gameInfo) {
      events.push(gameInfo);
      return events;
    }

    // 6. Chat parser chain over the whole remaining chunk. Break on first match.
    for (const parser of this.chatParsers) {
      const e = parser.parse(joined);
      if (e) {
        events.push(e);
        break;
      }
    }

    // 7. UNKNOWN fallback for the whole chunk.
    if (events.length === 0) {
      events.push(
        makeChatEvent(ChatEventType.UNKNOWN, joined, {
          message: joined,
        }),
      );
    }
    return events;
  }

  /**
   * Remove prompt echoes from the ends of a chunk. Port of Raptor's
   * IcsConnector.filterTrailingPrompts (IcsConnector.java), which runs in
   * parseMessage before IcsParser.parse ever sees the text.
   *
   * Two shapes, both real:
   *
   *   Leading. parseStream() flushes at the last `\n`, so a block's trailing
   *   `fics% ` has no newline after it and stays in the line buffer — it
   *   arrives glued to the front of the *next* chunk: `fics% \nGuestX tells
   *   you: hi`. Raptor loops here (`while startsWith(prompt + " ")`) because
   *   several prompts can stack up when the server is quiet.
   *
   *   Trailing. A chunk that ends mid-block, or one handed to parse()
   *   directly, still carries `\nfics% ` on the end.
   *
   * This is also why the single line `fics% <12> ...` was unrecognizable:
   * the prefix defeated Style12Parser's `startsWith("<12>")`, which is a
   * check Raptor makes too — but Raptor had already stripped the prompt by
   * then, so the question never reached its parser.
   */
  private filterPrompts(text: string): string {
    const prompt = this.prompt; // "fics% ", trailing space included
    const bare = prompt.trimEnd(); // "fics%"
    let out = text;
    while (out.startsWith(prompt)) {
      out = out.substring(prompt.length);
    }
    if (out.endsWith('\n' + prompt)) {
      return out.substring(0, out.length - prompt.length - 1);
    }
    if (out.endsWith('\n' + bare)) {
      return out.substring(0, out.length - bare.length - 1);
    }
    if (out.endsWith(prompt)) {
      return out.substring(0, out.length - prompt.length);
    }
    return out;
  }

  /**
   * Streaming variant: buffer across calls and only flush on newlines.
   * Use this when bytes arrive from a WebSocket in arbitrary chunks.
   */
  parseStream(incoming: string): ChatEvent[] {
    this.lineBuffer += incoming;
    // Emit everything up to the last newline; stash the rest.
    const lastNl = this.lineBuffer.lastIndexOf('\n');
    if (lastNl < 0) return [];
    const complete = this.lineBuffer.substring(0, lastNl + 1);
    this.lineBuffer = this.lineBuffer.substring(lastNl + 1);
    return this.parse(complete);
  }

  /** Force-flush any buffered partial line, treating it as complete. */
  flushBuffer(): ChatEvent[] {
    if (this.lineBuffer.length === 0) return [];
    const remainder = this.lineBuffer;
    this.lineBuffer = '';
    return this.parse(remainder);
  }

  // ========== Raptor: parseMovesMessage ==========
  // A moves message is eaten whole: match once against the whole chunk and,
  // if it matches, emit MOVES + return "". Otherwise return the chunk
  // unchanged so downstream phases see it.
  private parseMovesMessage(
    inboundMessage: string,
    events: ChatEvent[],
  ): string {
    const moves = this.chunkParsers.moves?.parse(inboundMessage);
    if (moves) {
      // Record before firing, so a listener woken by the event can read it.
      this.gameService?.recordMoves(moves);
      this.gameService?.fireGameMovesAdded(moves.gameId);
      events.push(
        makeChatEvent(ChatEventType.MOVES, inboundMessage, {
          message: inboundMessage,
          gameId: moves.gameId,
        }),
      );
      return '';
    }
    return inboundMessage;
  }

  // ========== Raptor: parseGameEvents ==========
  // Split by newline, run each line through the game-message parsers, fire
  // side effects, and accumulate the surviving text (some game lines are
  // kept in the chat stream, some are eaten).
  //
  // Behavior table (from IcsParser.java:472):
  //   G1              -> fire + eat (line stripped)
  //   Style12         -> fire + eat (line stripped, sets containedStyle12)
  //   B1              -> fire + eat
  //   GameEnd         -> fire + KEEP line (chat gets "Game X ended ..."); trim at end
  //   IllegalMove     -> fire + KEEP line (chat gets the server text)
  //   RemovingObs     -> fire + KEEP line
  //   PendInfo        -> handle + eat (<pf> / <pr> offer signals)
  //   NoLongerExam    -> fire + KEEP line
  //   Takeback        -> handle (side-effect only); do NOT eat
  //   Following       -> KEEP line (chat still sees it so the FOLLOWING
  //                      event is produced in the chat phase)
  //   setup-mode      -> fire + KEEP line ("Entering setup mode." etc.)
  //   anything else   -> KEEP line
  private parseGameEvents(inboundMessage: string): string {
    if (inboundMessage.length > MAX_GAME_MESSAGE) {
      return inboundMessage;
    }

    let trimAtEnd = false;
    const kept: string[] = [];
    const lines = inboundMessage.split('\n');
    const last = lines.length - 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasNextSep = i < last;
      const appendLine = () =>
        kept.push(line + (hasNextSep ? '\n' : ''));

      // Defensive: any line whose first token is a known server-level game
      // control marker (<12>, <g1>, <b1>, <pf>, ...) MUST NOT reach chat,
      // regardless of whether the typed parser succeeds. This is the
      // belt-and-suspenders fix for the `<12>` leak.
      const isGameControl = GAME_CONTROL_PREFIXES.some(p => line.startsWith(p));

      // G1 — eat
      try {
        const g1 = this.gameLineParsers.g1?.parse(line);
        if (g1) {
          this.gameService?.recordG1(g1);
          this.gameService?.fireGameCreated(g1.gameId);
          trimAtEnd = true;
          continue;
        }
      } catch {
        if (line.startsWith('<g1>')) { trimAtEnd = true; continue; }
      }

      // Style12 — eat
      try {
        const s12 = this.gameLineParsers.style12?.parse(line);
        if (s12) {
          const isFirstSeen = !this.gameService?.getLatestStyle12(s12.gameId);
          this.gameService?.recordStyle12(s12);
          // First Style12 for an observe/play/examine session fires a
          // GAME_CREATED so the UI can open a board even if the <g1> was
          // missed (e.g. observing a game already in progress).
          if (isFirstSeen) {
            this.gameService?.fireGameCreated(s12.gameId);
          }
          this.gameService?.fireGameStateChanged(s12.gameId, s12.san !== 'none');
          continue;
        }
      } catch {
        if (line.startsWith('<12>')) { trimAtEnd = true; continue; }
      }

      // B1 — eat
      try {
        const b1 = this.gameLineParsers.b1?.parse(line);
        if (b1) {
          this.gameService?.recordB1(b1);
          this.gameService?.fireDroppablePiecesChanged(b1.gameId);
          continue;
        }
      } catch {
        if (line.startsWith('<b1>')) { trimAtEnd = true; continue; }
      }

      // If we reach here and the line is still a game-control prefix, eat
      // it unconditionally — something about its body defeated the typed
      // parser (unknown ivariable combo, protocol drift) and we'd rather
      // drop one control line than spray it into chat.
      if (isGameControl) {
        trimAtEnd = true;
        continue;
      }

      // GameEnd — KEEP + trim at end
      const ge = this.gameLineParsers.gameEnd?.parse(line);
      if (ge) {
        this.gameService?.fireGameInactive(ge.gameId);
        this.gameService?.forgetGame(ge.gameId);
        appendLine();
        trimAtEnd = true;
        continue;
      }

      // IllegalMove — KEEP
      const im = this.gameLineParsers.illegalMove?.parse(line);
      if (im) {
        // No gameId in the server text; '*' signals "current active game".
        this.gameService?.fireIllegalMove('*', im.move);
        appendLine();
        continue;
      }

      // RemovingObs — KEEP
      const ro = this.gameLineParsers.removingObs?.parse(line);
      if (ro) {
        this.gameService?.fireGameInactive(ro.gameId);
        appendLine();
        continue;
      }

      // PendInfo — eat (<pf> offer-in / <pr> offer-removed)
      if (this.processPendInfo(line)) {
        trimAtEnd = true;
        continue;
      }

      // NoLongerExamining — KEEP
      const nle = this.gameLineParsers.noLongerExamining?.parse(line);
      if (nle) {
        this.gameService?.fireGameInactive(nle.gameId);
        appendLine();
        continue;
      }

      // Takeback — parse for side-effect, don't eat
      this.gameLineParsers.takeback?.parse(line);

      // Setup-mode transition detection (Raptor lines 570-577)
      if (
        line.startsWith('Entering setup mode.') &&
        !inboundMessage.includes('<12>')
      ) {
        this.gameService?.fireExaminedGameBecameSetup('*');
      } else if (
        line.startsWith('Game ') &&
        line.endsWith('enters setup mode.') &&
        !inboundMessage.includes('<12>')
      ) {
        this.gameService?.fireExaminedGameBecameSetup('*');
      }

      appendLine();
    }

    const joined = kept.join('');
    return trimAtEnd ? joined.trim() : joined;
  }

  /**
   * PendInfo handler for `<pf>` offer-in and `<pr>` offer-removed. Matches
   * Raptor's processPendInfo (IcsParser.java:1019) at a structural level —
   * full Offer construction will be filled in when we port the Offer parser.
   */
  private processPendInfo(line: string): boolean {
    if (line.startsWith('<pf>') || line.startsWith('<pr>')) {
      // TODO: build Offer + fireOfferReceived/fireOfferRemoved.
      return true;
    }
    return false;
  }

  // ========== Raptor: processBugWho / processSought / processGameInfo ==========
  private processBugWho(chunk: string): ChatEvent | null {
    // Currently only BugWhoAll whole-block matcher. The 3-way split
    // (BUGWHO_GAMES / BUGWHO_AVAILABLE_TEAMS / BUGWHO_UNPARTNERED_BUGGERS)
    // arrives with the per-subparser port.
    const res = this.chunkParsers.bugWhoAll?.parse(chunk);
    if (res) {
      return makeChatEvent(ChatEventType.BUGWHO_ALL, chunk, {
        message: chunk,
      });
    }
    return null;
  }

  private processSought(chunk: string): ChatEvent | null {
    const res = this.chunkParsers.sought?.parse(chunk);
    if (res) {
      return makeChatEvent(ChatEventType.SEEKS, chunk, { message: chunk });
    }
    return null;
  }

  private processGameInfo(chunk: string): ChatEvent | null {
    const res = this.chunkParsers.gameInfo?.parse(chunk);
    if (res) {
      this.gameService?.fireGameInfoChanged(res);
      return makeChatEvent(ChatEventType.GAMES, chunk, { message: chunk });
    }
    return null;
  }
}

function isNotBlank(s: string): boolean {
  return s != null && s.trim().length > 0;
}
