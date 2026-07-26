import { observable } from 'mobx';
import type { ChatEvent } from '../events/ChatEvent.js';
import { ChatEventType } from '../events/ChatEventType.js';
import type { ChatService, ChatListener } from '../services/ChatService.js';
import type { Connector } from '../services/Connector.js';
import {
  ChatTabStore,
  ChannelTabStore,
  MainConsoleTabStore,
  PartnerTabStore,
  PersonTabStore,
} from './ChatTabStore.js';

/**
 * Owns the collection of chat tabs (one `MainConsoleTabStore`, plus
 * per-channel, per-person, and partner tabs created lazily as server
 * traffic arrives).
 *
 * - On first CHANNEL_TELL for a channel we haven't seen, auto-create
 *   a ChannelTabStore and register it with ChatService.
 * - On first TELL from a person, auto-create a PersonTabStore.
 * - On first PARTNER_TELL, auto-create the partner tab.
 *
 * This matches Raptor's lazy tab-open semantics (new tabs appear the
 * first time you get a tell in a new channel), but without the
 * Workbench/SWT plumbing.
 */
export class TabStoreRegistry {
  readonly tabs = observable.array<ChatTabStore>([], { deep: false });
  readonly mainConsole: MainConsoleTabStore;

  private readonly chatService: ChatService;
  private readonly connector: Connector;

  constructor(chatService: ChatService, connector: Connector) {
    this.chatService = chatService;
    this.connector = connector;
    this.mainConsole = new MainConsoleTabStore(connector);
    // `tabs` is already `observable.array`; no need to make `this`
    // observable (which would conflict with subclasses anyway).

    // Main console: catches every event that no specialized tab claimed.
    chatService.addMainConsoleListener(this.mainConsole);
    this.tabs.push(this.mainConsole);

    // Auto-spawn tabs when tellable traffic arrives in a context we don't
    // yet have a tab for. This router listener does NOT consume events —
    // it calls ensureTabFor, which registers a new tab with ChatService,
    // and ChatService publishes the event to THAT new tab on the next
    // dispatch. (We also feed the current event to the newly-created tab
    // directly so it doesn't miss the first message that spawned it.)
    const routerListener: ChatListener = {
      id: 'TabStoreRegistry.router',
      accepts: ev =>
        ev.type === ChatEventType.CHANNEL_TELL ||
        ev.type === ChatEventType.TELL ||
        ev.type === ChatEventType.PARTNER_TELL ||
        ev.type === ChatEventType.OUTBOUND,
      handle: ev => this.ensureTabFor(ev),
    };
    chatService.addListener(routerListener);
  }

  dispose(): void {
    this.chatService.removeListener(this.mainConsole.id);
    this.chatService.removeListener('TabStoreRegistry.router');
    for (const t of this.tabs) {
      if (t !== this.mainConsole) {
        this.chatService.removeListener(t.id);
      }
    }
    this.tabs.clear();
  }

  getOrCreateChannelTab(channel: string): { tab: ChannelTabStore; created: boolean } {
    const existing = this.tabs.find(
      t => t.kind === 'channel' && (t as ChannelTabStore).channel === channel,
    ) as ChannelTabStore | undefined;
    if (existing) return { tab: existing, created: false };
    const tab = new ChannelTabStore(channel, this.connector);
    this.tabs.push(tab);
    this.chatService.addListener(tab);
    return { tab, created: true };
  }

  getOrCreatePersonTab(person: string): { tab: PersonTabStore; created: boolean } {
    const lower = person.toLowerCase();
    const existing = this.tabs.find(
      t =>
        t.kind === 'person' &&
        (t as PersonTabStore).person.toLowerCase() === lower,
    ) as PersonTabStore | undefined;
    if (existing) return { tab: existing, created: false };
    const tab = new PersonTabStore(person, this.connector);
    this.tabs.push(tab);
    this.chatService.addListener(tab);
    return { tab, created: true };
  }

  getOrCreatePartnerTab(): { tab: PartnerTabStore; created: boolean } {
    const existing = this.tabs.find(t => t.kind === 'partner') as
      | PartnerTabStore
      | undefined;
    if (existing) return { tab: existing, created: false };
    const tab = new PartnerTabStore(this.connector);
    this.tabs.push(tab);
    this.chatService.addListener(tab);
    return { tab, created: true };
  }

  /** Close a tab (anything but the main console). */
  closeTab(id: string): void {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const tab = this.tabs[idx];
    if (tab === this.mainConsole) return;
    this.chatService.removeListener(tab.id);
    this.tabs.splice(idx, 1);
  }

  private ensureTabFor(ev: ChatEvent): void {
    // We're called as part of ChatService.publish; the snapshot taken
    // there means a brand-new tab's listener does NOT see the current
    // event via normal dispatch. So for NEWLY created tabs we feed the
    // event directly. Existing tabs are already in the snapshot and
    // will receive the event through the normal listener path.
    const feedIfNew = (result: { tab: ChatTabStore; created: boolean }) => {
      if (result.created && result.tab.accepts(ev)) result.tab.handle(ev);
    };
    switch (ev.type) {
      case ChatEventType.CHANNEL_TELL:
        if (ev.channel) feedIfNew(this.getOrCreateChannelTab(ev.channel));
        break;
      case ChatEventType.TELL:
        if (ev.source) feedIfNew(this.getOrCreatePersonTab(ev.source));
        break;
      case ChatEventType.PARTNER_TELL:
        feedIfNew(this.getOrCreatePartnerTab());
        break;
      case ChatEventType.OUTBOUND: {
        const m = /^tell\s+(\S+)\s+/i.exec(ev.message);
        if (m) {
          const target = m[1];
          if (/^\d+$/.test(target)) feedIfNew(this.getOrCreateChannelTab(target));
          else feedIfNew(this.getOrCreatePersonTab(target));
        } else if (/^ptell\s+/i.test(ev.message)) {
          feedIfNew(this.getOrCreatePartnerTab());
        }
        break;
      }
    }
  }
}
