import { ChatEventType } from '../events/ChatEventType.js';
import { makeChatEvent } from '../events/ChatEvent.js';
import type { ChatService } from './ChatService.js';
import {
  filterOutbound,
  breakUpMessage,
  MAX_SEND_MESSAGE_LENGTH,
  MAX_MESSAGE_MESSAGE_LENGTH,
} from './IcsUtils.js';

/**
 * A Connector is the thing that actually speaks to FICS: it sends commands
 * to the server and emits parsed inbound events via a ChatService (and
 * later a GameService).
 *
 * Parity with Raptor's Connector interface / IcsConnector.
 *
 * The concrete WebSocket + Timeseal2 implementation lives elsewhere; this
 * interface + base class handle the parts every connector shares:
 *   - outbound filtering (Maciejg encoding for unicode)
 *   - long-message splitting (400 / 800 char limits)
 *   - OUTBOUND event synthesis so tabs can echo the user's own message
 *   - alias processing (placeholder until AliasService is built)
 */
export interface Connector {
  isConnected(): boolean;

  /**
   * Send a raw command string. This is the single outbound entry point.
   * Returns false if the send was vetoed.
   */
  sendMessage(msg: string): boolean;

  /** Send without echoing to tabs (e.g. internal ping/keepalive). */
  sendMessageHidden(msg: string): boolean;
}

export interface ConnectorDeps {
  chatService: ChatService;
  /** Write bytes to the actual transport. */
  sendRaw: (line: string) => void;
  /** Determine if outbound needs vetoing (Raptor's vetoMessage equivalent). */
  vetoMessage?: (msg: string) => string | null;
}

/**
 * Base connector with Raptor's outbound plumbing. Subclass and supply
 * `sendRaw` via deps to wire up a transport.
 */
export abstract class BaseConnector implements Connector {
  protected readonly deps: ConnectorDeps;

  constructor(deps: ConnectorDeps) {
    this.deps = deps;
  }

  abstract isConnected(): boolean;

  sendMessage(msg: string): boolean {
    return this.doSend(msg, /*hidden*/ false);
  }

  sendMessageHidden(msg: string): boolean {
    return this.doSend(msg, /*hidden*/ true);
  }

  private doSend(msg: string, hidden: boolean): boolean {
    if (!this.isConnected()) return false;

    // Veto hook — lets callers block specific commands.
    const vetoReason = this.deps.vetoMessage?.(msg);
    if (vetoReason) {
      this.deps.chatService.publish(
        makeChatEvent(ChatEventType.INTERNAL, msg, {
          message: 'Send blocked: ' + vetoReason,
        }),
      );
      return false;
    }

    // Maciej-encode unicode and strip control chars.
    const filtered = filterOutbound(msg);

    // Long-tell splitting.
    const { chunks, warning } = breakUpMessage(filtered);
    if (warning) {
      this.deps.chatService.publish(
        makeChatEvent(ChatEventType.INTERNAL, msg, { message: warning }),
      );
    }
    for (const chunk of chunks) {
      this.deps.sendRaw(chunk + '\n');
    }

    // Echo as an OUTBOUND event so tabs can display it. Skip if hidden
    // (matches Raptor's isHidingFromUser flag in IcsConnector.java:1205).
    if (!hidden) {
      this.deps.chatService.publish(
        makeChatEvent(ChatEventType.OUTBOUND, msg, { message: msg.trim() }),
      );
    }

    return true;
  }
}

export { MAX_SEND_MESSAGE_LENGTH, MAX_MESSAGE_MESSAGE_LENGTH };
