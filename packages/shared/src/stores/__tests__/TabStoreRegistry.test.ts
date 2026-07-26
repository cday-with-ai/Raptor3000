import { describe, it, expect, beforeEach } from 'vitest';
import { TabStoreRegistry } from '../TabStoreRegistry.js';
import { ChatService } from '../../services/ChatService.js';
import { makeChatEvent } from '../../events/ChatEvent.js';
import { ChatEventType } from '../../events/ChatEventType.js';
import { BaseConnector } from '../../services/Connector.js';

class TestConnector extends BaseConnector {
  sent: string[] = [];
  hidden: string[] = [];
  override sendMessage(msg: string): boolean {
    this.sent.push(msg);
    return true;
  }
  override sendMessageHidden(msg: string): boolean {
    this.hidden.push(msg);
    return true;
  }
  isConnected(): boolean {
    return true;
  }
  protected sendRawString(): void {}
}

describe('TabStoreRegistry', () => {
  let chatService: ChatService;
  let connector: TestConnector;
  let registry: TabStoreRegistry;

  beforeEach(() => {
    chatService = new ChatService();
    connector = new TestConnector({ chatService, sendRaw: () => {} });
    registry = new TabStoreRegistry(chatService, connector);
  });

  it('starts with a single main-console tab', () => {
    expect(registry.tabs).toHaveLength(1);
    expect(registry.tabs[0].kind).toBe('main');
  });

  it('spawns a channel tab when a CHANNEL_TELL arrives', () => {
    chatService.publish(
      makeChatEvent(ChatEventType.CHANNEL_TELL, 'Alice(50): hi', {
        source: 'Alice',
        channel: '50',
        message: 'hi',
      }),
    );
    expect(registry.tabs).toHaveLength(2);
    expect(registry.tabs[1].kind).toBe('channel');
    expect((registry.tabs[1] as { channel?: string }).channel).toBe('50');
    // The spawning event itself must be visible in the new tab.
    expect(registry.tabs[1].events).toHaveLength(1);
  });

  it('reuses existing channel tab on repeat messages', () => {
    for (let i = 0; i < 3; i++) {
      chatService.publish(
        makeChatEvent(ChatEventType.CHANNEL_TELL, `Alice(50): msg${i}`, {
          source: 'Alice',
          channel: '50',
          message: `msg${i}`,
        }),
      );
    }
    expect(registry.tabs).toHaveLength(2);
    expect(registry.tabs[1].events).toHaveLength(3);
  });

  it('spawns a person tab on first incoming TELL', () => {
    chatService.publish(
      makeChatEvent(ChatEventType.TELL, 'Bob tells you: hello', {
        source: 'Bob',
        message: 'hello',
      }),
    );
    const personTab = registry.tabs.find(t => t.kind === 'person');
    expect(personTab).toBeDefined();
    expect((personTab as { person?: string }).person).toBe('Bob');
  });

  it('spawns a channel tab when user sends `tell N ...`', () => {
    chatService.publish(
      makeChatEvent(ChatEventType.OUTBOUND, 'tell 50 hi everyone', {
        message: 'tell 50 hi everyone',
      }),
    );
    const ch = registry.tabs.find(t => t.kind === 'channel');
    expect(ch).toBeDefined();
    expect((ch as { channel?: string }).channel).toBe('50');
  });

  it('closes a non-main tab on request but keeps main', () => {
    chatService.publish(
      makeChatEvent(ChatEventType.CHANNEL_TELL, 'Alice(50): hi', {
        source: 'Alice',
        channel: '50',
        message: 'hi',
      }),
    );
    const channelTabId = registry.tabs[1].id;
    registry.closeTab(channelTabId);
    expect(registry.tabs).toHaveLength(1);
    // Attempting to close main is a no-op.
    registry.closeTab(registry.mainConsole.id);
    expect(registry.tabs).toHaveLength(1);
  });

  it('main console sees all event types as fallback', () => {
    chatService.publish(
      makeChatEvent(ChatEventType.SHOUT, 'Alice shouts: yo', {
        source: 'Alice',
        message: 'yo',
      }),
    );
    expect(registry.mainConsole.events).toHaveLength(1);
  });
});
