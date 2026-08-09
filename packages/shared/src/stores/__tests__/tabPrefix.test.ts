import { describe, it, expect, beforeEach } from 'vitest';
import { TabPrefix, applyTabPrefix } from '../TabPrefix.js';
import {
  ChannelTabStore,
  MainConsoleTabStore,
  PartnerTabStore,
  PersonTabStore,
} from '../ChatTabStore.js';
import { ChatEventType } from '../../events/ChatEventType.js';
import type { ChatEvent } from '../../events/ChatEvent.js';
import type { Connector } from '../../services/Connector.js';

/**
 * Reported by Carson 2026-08-05: typing `tell 39 hi` while the channel-39 tab
 * is active sent `tell 39 tell 39 hi`. The prefix is applied at send time
 * rather than pre-inserted in the widget (Raptor does the latter), so the app
 * cannot see that the user already typed it — unless it looks.
 */
describe('applyTabPrefix', () => {
  const channel39 = TabPrefix.channel(39);

  it('prefixes a plain message', () => {
    expect(applyTabPrefix(channel39, 'hi')).toBe('tell 39 hi');
  });

  it('does not double a prefix the user typed themselves', () => {
    expect(applyTabPrefix(channel39, 'tell 39 hi')).toBe('tell 39 hi');
  });

  it('leaves main-console input alone — no prefix, nothing to strip', () => {
    expect(applyTabPrefix(TabPrefix.main(), 'tell 39 hi')).toBe('tell 39 hi');
    expect(applyTabPrefix(TabPrefix.main(), 'who')).toBe('who');
  });

  it('is case-insensitive about the command word', () => {
    expect(applyTabPrefix(channel39, 'TELL 39 hi')).toBe('tell 39 hi');
    expect(applyTabPrefix(channel39, 'Tell 39 hi')).toBe('tell 39 hi');
  });

  it('tolerates and normalises loose spacing', () => {
    expect(applyTabPrefix(channel39, '  tell   39   hi')).toBe('tell 39 hi');
  });

  it('is idempotent — applying twice is applying once', () => {
    const once = applyTabPrefix(channel39, 'hi');
    expect(applyTabPrefix(channel39, once)).toBe(once);
  });

  it('strips one occurrence only, because the rest is the message', () => {
    // In an alice tab, the second `tell alice` is what alice should read.
    const alice = TabPrefix.person('alice');
    expect(applyTabPrefix(alice, 'tell alice tell alice about the bug')).toBe(
      'tell alice tell alice about the bug',
    );
  });

  it('only recognises this tab\'s own target', () => {
    // Deliberate: `tell 40` in the 39 tab is a mistake FICS should report,
    // not something to silently redirect. Pinning the choice, not endorsing
    // the resulting line.
    expect(applyTabPrefix(channel39, 'tell 40 hi')).toBe('tell 39 tell 40 hi');
  });

  it('does not mistake a channel prefix for another channel starting with it', () => {
    const channel3 = TabPrefix.channel(3);
    expect(applyTabPrefix(channel3, 'tell 39 hi')).toBe('tell 3 tell 39 hi');
  });

  it('does not strip the word tell when it is the message', () => {
    expect(applyTabPrefix(channel39, 'tell me about it')).toBe(
      'tell 39 tell me about it',
    );
    expect(applyTabPrefix(channel39, 'telling stories')).toBe(
      'tell 39 telling stories',
    );
  });

  it('handles a bare prefix with nothing after it', () => {
    // Better an empty tell FICS rejects than `tell 39 tell 39`.
    expect(applyTabPrefix(channel39, 'tell 39')).toBe('tell 39 ');
  });

  it('handles the partner prefix', () => {
    const partner = TabPrefix.partner();
    expect(applyTabPrefix(partner, 'mate in 2')).toBe('ptell mate in 2');
    expect(applyTabPrefix(partner, 'ptell mate in 2')).toBe('ptell mate in 2');
    expect(applyTabPrefix(partner, 'PTELL mate in 2')).toBe('ptell mate in 2');
    // `tell` is not `ptell`, and must not be eaten by it.
    expect(applyTabPrefix(partner, 'tell him')).toBe('ptell tell him');
  });

  it('handles the person prefix, case-insensitively on the handle', () => {
    const alice = TabPrefix.person('Alice');
    expect(applyTabPrefix(alice, 'hello')).toBe('tell Alice hello');
    expect(applyTabPrefix(alice, 'tell Alice hello')).toBe('tell Alice hello');
    // FICS handles are case-insensitive; the tab's casing wins.
    expect(applyTabPrefix(alice, 'tell alice hello')).toBe('tell Alice hello');
  });

  it('handles the game-chat prefix', () => {
    const game = TabPrefix.gameChat('42');
    expect(applyTabPrefix(game, 'nice game')).toBe('xwhisper 42 nice game');
    expect(applyTabPrefix(game, 'xwhisper 42 nice game')).toBe(
      'xwhisper 42 nice game',
    );
  });
});

/** Minimal connector: records what was sent, ignores everything else. */
class RecordingConnector {
  readonly sent: string[] = [];
  sendMessage(msg: string): boolean {
    this.sent.push(msg);
    return true;
  }
}

describe('ChatTabStore.sendInput', () => {
  let connector: RecordingConnector;
  const asConnector = (): Connector => connector as unknown as Connector;

  beforeEach(() => {
    connector = new RecordingConnector();
  });

  it('sends a channel message with the tab prefix', () => {
    new ChannelTabStore('39', asConnector()).sendInput('hi');
    expect(connector.sent).toEqual(['tell 39 hi']);
  });

  it('does not double the prefix the user typed', () => {
    new ChannelTabStore('39', asConnector()).sendInput('tell 39 hi');
    expect(connector.sent).toEqual(['tell 39 hi']);
  });

  it('strips the trailing newline before prefixing', () => {
    new ChannelTabStore('39', asConnector()).sendInput('tell 39 hi\r\n');
    expect(connector.sent).toEqual(['tell 39 hi']);
  });

  it('sends nothing for empty input', () => {
    new ChannelTabStore('39', asConnector()).sendInput('\n');
    expect(connector.sent).toEqual([]);
  });

  it('passes main-console input through untouched', () => {
    new MainConsoleTabStore(asConnector()).sendInput('tell 39 hi');
    expect(connector.sent).toEqual(['tell 39 hi']);
  });

  it('does not double ptell in the partner tab', () => {
    new PartnerTabStore(asConnector()).sendInput('ptell mate in 2');
    expect(connector.sent).toEqual(['ptell mate in 2']);
  });

  it('does not double a person tell', () => {
    new PersonTabStore('alice', asConnector()).sendInput('tell alice hello');
    expect(connector.sent).toEqual(['tell alice hello']);
  });

  it('produces an outbound line the same tab still accepts', () => {
    // The tabs filter their own echo by prefix (ChannelTabStore.accepts), so
    // a de-duplicated send must not fall out of its own transcript.
    const tab = new ChannelTabStore('39', asConnector());
    tab.sendInput('tell 39 hi');
    const echo: ChatEvent = {
      type: ChatEventType.OUTBOUND,
      raw: connector.sent[0],
      time: 0,
      source: null,
      channel: null,
      gameId: null,
      message: connector.sent[0],
      pingMs: null,
    };
    expect(tab.accepts(echo)).toBe(true);
  });
});
