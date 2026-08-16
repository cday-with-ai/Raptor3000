import type { ChatService, ChatEvent } from '@raptor3000/shared';
import { ChatEventType } from '@raptor3000/shared';
import { outboundTell } from '../chatFormat.js';

export interface TellResolverDeps {
  chatService: ChatService;
}

/**
 * TellResolver — pairs outbound tells with their FICS confirmations.
 *
 * When a user types `tell alfred hi`, FICS resolves "alfred" to the
 * unique matching handle (e.g. "afredw") and confirms with (told afredw).
 * The typed name and the confirmed name used to open two person tabs
 * for one conversation; this machine tracks the resolution so tabs key
 * on the canonical handle.
 *
 * The machine is driven by two inputs:
 *  - `onUserCommand(line)` — outbound tells detected from user commands
 *  - chatService TOLD events — FICS's confirmation of the resolved name
 *
 * The resolved map persists across reconnections; stale entries are harmless
 * and the next partial tell simply overwrites.
 */
export class TellResolver {
  private pending: string[] = [];
  private readonly resolved = new Map<string, string>();

  constructor(deps: TellResolverDeps) {
    deps.chatService.addListener({
      id: 'tell-resolver',
      accepts: e => e.type === ChatEventType.TOLD && !/^\d+$/.test(e.source ?? ''),
      handle: e => this.onTold(e),
    });
  }

  /** Called when the user sends a command; detects outbound tells. */
  onUserCommand(line: string): void {
    const t = line.trim().replace(/\s+/g, ' ');
    const m = outboundTell(t);
    if (!m) return;
    if (/^\d+$/.test(m.target)) return;
    this.pending.push(m.target);
  }

  private onTold(e: ChatEvent): void {
    const confirmed = e.source;
    if (!confirmed) return;
    const typed = this.pending.shift();
    if (!typed) return;
    if (confirmed.toLowerCase() !== typed.toLowerCase()) {
      this.resolved.set(typed.toLowerCase(), confirmed);
    }
  }

  /**
   * Given a typed tell target, return the canonical FICS handle if
   * known, otherwise return the typed name as-is.
   */
  resolve(typed: string): string {
    return this.resolved.get(typed.toLowerCase()) ?? typed;
  }
}
