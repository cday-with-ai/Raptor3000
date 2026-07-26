import { ChatEventType } from './ChatEventType.js';

/**
 * Parsed, typed chat event. Emitted by the parser registry, consumed by
 * ChatService and routed to tab stores that self-filter via `accepts()`.
 *
 * Mirrors Raptor's ChatEvent (raptor/chat/ChatEvent.java) — minus the
 * SWT-specific sound-handling flag, which we handle via separate plugins.
 */
export interface ChatEvent {
  readonly type: ChatEventType;

  /** The raw FICS line that produced this event (for debug + unknown fallback). */
  readonly raw: string;

  /** Time the client received the line (ms since epoch). */
  readonly time: number;

  /** Sender username, or `null` for broadcasts/server messages. */
  readonly source: string | null;

  /** Channel number for CHANNEL_TELL, else null. */
  readonly channel: string | null;

  /** Associated game id (kibitz/whisper/game offers) or null. */
  readonly gameId: string | null;

  /** The human-readable message text (stripped of the FICS envelope). */
  readonly message: string;

  /** Round-trip ms for PING_RESPONSE events, else null. */
  readonly pingMs: number | null;
}

export function makeChatEvent(
  type: ChatEventType,
  raw: string,
  fields: Partial<Omit<ChatEvent, 'type' | 'raw' | 'time'>> = {},
): ChatEvent {
  return {
    type,
    raw,
    time: Date.now(),
    source: fields.source ?? null,
    channel: fields.channel ?? null,
    gameId: fields.gameId ?? null,
    message: fields.message ?? '',
    pingMs: fields.pingMs ?? null,
  };
}
