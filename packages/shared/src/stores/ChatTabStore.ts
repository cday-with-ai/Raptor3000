import { action, observable } from 'mobx';
import { ChatEventType } from '../events/ChatEventType.js';
import type { ChatEvent } from '../events/ChatEvent.js';
import type { ChatListener } from '../services/ChatService.js';
import type { Connector } from '../services/Connector.js';
import { applyTabPrefix } from './TabPrefix.js';

/**
 * Base store for a single chat tab. Each subclass self-filters via
 * `accepts()` — matches Raptor's `ChatConsoleController.isAcceptingChatEvent`
 * pattern where tabs decide their own relevance rather than a central
 * router knowing about every tab type.
 */
export abstract class ChatTabStore implements ChatListener {
  readonly id: string;
  readonly kind: string;

  /** Prefix pre-inserted into the input widget for this tab. */
  readonly prefix: string;

  /** Displayed events, oldest first. Capped at `maxEvents`. */
  readonly events = observable.array<ChatEvent>([], { deep: false });

  /** Cap to prevent unbounded growth. */
  maxEvents = 2000;

  protected readonly connector: Connector;

  constructor(id: string, kind: string, prefix: string, connector: Connector) {
    this.id = id;
    this.kind = kind;
    this.prefix = prefix;
    this.connector = connector;
    // `events` is already an `observable.array`, which is what the UI
    // subscribes to. We deliberately don't use `makeAutoObservable`
    // here because MobX forbids it on a class with subclasses.
  }

  abstract accepts(event: ChatEvent): boolean;

  handle = action((event: ChatEvent): void => {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  });

  /**
   * Send user input through the connector, prefixed for this tab.
   *
   * Mirrors Raptor where the input widget holds the prefix as a
   * pre-inserted buffer — except we apply it at send time rather than
   * managing widget text, which is why `applyTabPrefix` has to cope with a
   * user who typed the command themselves. See its contract.
   */
  sendInput(input: string): void {
    const trimmed = input.replace(/\r?\n$/, '');
    if (trimmed.length === 0) return;
    this.connector.sendMessage(applyTabPrefix(this.prefix, trimmed));
  }

  clear = action((): void => {
    this.events.clear();
  });
}

/**
 * Main console: catches everything that wasn't specifically routed, plus
 * a few always-shown types (internal/outbound/unknown).
 * Raptor: MainController.isAcceptingChatEvent (line ~112) accepts all.
 */
export class MainConsoleTabStore extends ChatTabStore {
  constructor(connector: Connector) {
    super('main', 'main', '', connector);
  }
  accepts(_event: ChatEvent): boolean {
    return true;
  }
}

/**
 * Channel N tab.
 * Raptor: ChannelController.java:95-101 — accepts CHANNEL_TELL with matching
 * channel, plus OUTBOUND lines that start with `tell N ` (so your own
 * channel messages show up).
 */
export class ChannelTabStore extends ChatTabStore {
  readonly channel: string;

  constructor(channel: string, connector: Connector) {
    super('channel:' + channel, 'channel', `tell ${channel} `, connector);
    this.channel = channel;
  }

  accepts(event: ChatEvent): boolean {
    if (event.type === ChatEventType.CHANNEL_TELL && event.channel === this.channel) {
      return true;
    }
    if (event.type === ChatEventType.OUTBOUND) {
      return event.message.startsWith(`tell ${this.channel} `);
    }
    return false;
  }
}

/**
 * Person tab (direct tells to/from a specific user).
 * Raptor: PersonController.java:136-139 — accepts TELL from them plus
 * OUTBOUND containing their name.
 */
export class PersonTabStore extends ChatTabStore {
  readonly person: string;

  constructor(person: string, connector: Connector) {
    super('person:' + person.toLowerCase(), 'person', `tell ${person} `, connector);
    this.person = person;
  }

  accepts(event: ChatEvent): boolean {
    const target = this.person.toLowerCase();
    if (event.type === ChatEventType.TELL && event.source?.toLowerCase() === target) {
      return true;
    }
    if (event.type === ChatEventType.TOLD && event.source?.toLowerCase() === target) {
      return true;
    }
    if (event.type === ChatEventType.OUTBOUND) {
      // `tell <person> ...`
      return event.message.toLowerCase().startsWith(`tell ${target} `);
    }
    return false;
  }
}

/**
 * Bughouse partner tab.
 * Raptor: BughousePartnerController.java:88-92 — PARTNER_TELL plus OUTBOUND
 * matching `ptell ...`.
 */
export class PartnerTabStore extends ChatTabStore {
  constructor(connector: Connector) {
    super('partner', 'partner', 'ptell ', connector);
  }
  accepts(event: ChatEvent): boolean {
    if (event.type === ChatEventType.PARTNER_TELL) return true;
    if (event.type === ChatEventType.OUTBOUND) {
      return event.message.startsWith('ptell ');
    }
    return false;
  }
}
