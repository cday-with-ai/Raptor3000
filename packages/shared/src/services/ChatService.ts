import type { ChatEvent } from '../events/ChatEvent.js';

/**
 * A chat listener self-filters: it gets every event and decides whether
 * it applies. This matches Raptor's ChatConsoleController.isHandling
 * pattern and keeps routing decentralized — adding a new tab type is
 * just implementing this interface.
 */
export interface ChatListener {
  /** Stable debug name for the listener (e.g. "ChannelTab(50)"). */
  readonly id: string;

  /** Return true if this listener wants to consume the event. */
  accepts(event: ChatEvent): boolean;

  /** Handle an accepted event. Must be non-blocking. */
  handle(event: ChatEvent): void;
}

/**
 * Synchronous fan-out of parsed chat events to listeners.
 *
 * Design ported from Raptor's ChatService + ChatConsoleController
 * self-filtering pattern (https://github.com/fbergo/Raptor, BSD license).
 *
 * Dispatch difference: Raptor fired chat events asynchronously through
 * a ThreadService pool so listener work could parallelize across cores
 * on the JVM. That was a sensible choice on a desktop JVM in 2008.
 *
 * In a browser JS runtime there is no multi-core benefit available to us
 * — all listener callbacks run on the single main thread regardless. So
 * we dispatch synchronously, in parse order. It's simpler, preserves
 * ordering trivially, and keeps stack traces intact for debugging.
 *
 * Listeners should return quickly; if one needs heavy work it should
 * queue it on its own side.
 */
export class ChatService {
  private readonly listeners = new Map<string, ChatListener>();
  private readonly mainFallback = new Map<string, ChatListener>();

  /** Register a listener that accepts specific events (tabs). */
  addListener(listener: ChatListener): void {
    this.listeners.set(listener.id, listener);
  }

  /** Register a listener that catches everything (main console). */
  addMainConsoleListener(listener: ChatListener): void {
    this.mainFallback.set(listener.id, listener);
  }

  removeListener(id: string): void {
    this.listeners.delete(id);
    this.mainFallback.delete(id);
  }

  publish(event: ChatEvent): void {
    // Snapshot the listener sets — a handler (e.g. TabStoreRegistry's
    // router) might add a new listener during dispatch, and the newly
    // added tab shouldn't receive the current event twice via the live
    // iterator. If the router wants the new tab to see the event, it
    // feeds it directly.
    const listeners = [...this.listeners.values()];
    const fallbacks = [...this.mainFallback.values()];

    let consumedBySpecific = false;
    for (const listener of listeners) {
      if (listener.accepts(event)) {
        listener.handle(event);
        consumedBySpecific = true;
      }
    }
    if (!consumedBySpecific) {
      for (const listener of fallbacks) {
        listener.handle(event);
      }
    } else {
      for (const listener of fallbacks) {
        if (listener.accepts(event)) listener.handle(event);
      }
    }
  }

  publishAll(events: readonly ChatEvent[]): void {
    for (const e of events) this.publish(e);
  }

  /** For debug/inspection — don't mutate. */
  getListenerIds(): string[] {
    return [...this.listeners.keys(), ...this.mainFallback.keys()];
  }
}
