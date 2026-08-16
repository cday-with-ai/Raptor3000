import { describe, it, expect } from 'vitest';
import {
  ChatEventType,
  ChatService,
  makeChatEvent,
} from '@raptor3000/shared';
import { TellResolver } from '../TellResolver.js';

/**
 * TellResolver tests — the partial-name → canonical-handle pairing.
 *
 * Drives the machine directly: commands through onUserCommand, FICS
 * confirmations through chatService.publish. resolve() is the
 * read-side — given what the user typed, it returns the canonical name
 * or the typed name as-is.
 */

function makeResolver(): { chatService: ChatService; resolver: TellResolver } {
  const chatService = new ChatService();
  const resolver = new TellResolver({ chatService });
  return { chatService, resolver };
}

function feedTold(chatService: ChatService, handle: string): void {
  chatService.publish(
    makeChatEvent(ChatEventType.TOLD, `(told ${handle})`, { source: handle }),
  );
}

describe('basic resolution', () => {
  it('resolves a partial name to the canonical handle', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell alfred saw qd8 right away');
    feedTold(chatService, 'afredw');

    expect(resolver.resolve('alfred')).toBe('afredw');
  });

  it('returns the typed name as-is when no resolution exists', () => {
    const { resolver } = makeResolver();

    expect(resolver.resolve('billjr')).toBe('billjr');
  });

  it('preserves case on the canonical handle', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell AlfrEd hi');
    feedTold(chatService, 'Afredw');

    expect(resolver.resolve('AlfrEd')).toBe('Afredw');
    expect(resolver.resolve('alfred')).toBe('Afredw');
  });
});

describe('queue ordering', () => {
  it('pairs the first TOLD with the first pending tell', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell alfred hi');
    resolver.onUserCommand('tell billjr hello');
    feedTold(chatService, 'afredw');
    feedTold(chatService, 'billjrf');

    expect(resolver.resolve('alfred')).toBe('afredw');
    expect(resolver.resolve('billjr')).toBe('billjrf');
  });

  it('a TOLD with no pending tell is harmlessly ignored', () => {
    const { chatService, resolver } = makeResolver();

    feedTold(chatService, 'ghost');

    expect(resolver.resolve('ghost')).toBe('ghost');
  });
});

describe('FICS suppression', () => {
  it('does not push numeric channel tells onto the queue', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell 39 hello everyone');
    feedTold(chatService, 'afredw');

    // The pending queue is empty — the TOLD has nothing to pair with.
    // "39" should not appear in the resolved map.
    expect(resolver.resolve('39')).toBe('39');
  });

  it('does not push bare names (no body) onto the queue', () => {
    const { resolver } = makeResolver();

    // "tell alfred" without a body doesn't match outboundTell's regex.
    resolver.onUserCommand('tell alfred');

    expect(resolver.resolve('alfred')).toBe('alfred');
  });
});

describe('no TOLD needed', () => {
  it('when the typed name IS the canonical name, no entry is recorded', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell billjr saw mate');
    feedTold(chatService, 'billjr');

    // Same before and after — nothing to resolve.
    expect(resolver.resolve('billjr')).toBe('billjr');
  });
});

describe('multiple partial tells', () => {
  it('resolves independent partial names in sequence', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell alfred hi');
    feedTold(chatService, 'afredw');
    resolver.onUserCommand('tell bobster hello');
    feedTold(chatService, 'bobsters');

    expect(resolver.resolve('alfred')).toBe('afredw');
    expect(resolver.resolve('bobster')).toBe('bobsters');
  });

  it('overwrites a prior resolution if the same partial is told again', () => {
    const { chatService, resolver } = makeResolver();

    resolver.onUserCommand('tell alfred first');
    feedTold(chatService, 'afredw');
    resolver.onUserCommand('tell alfred second');
    feedTold(chatService, 'afredw2');

    expect(resolver.resolve('alfred')).toBe('afredw2');
  });
});
