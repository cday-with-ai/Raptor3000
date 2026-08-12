import { describe, it, expect } from 'vitest';
import { TabPrefix, applyTabPrefix } from '../TabPrefix.js';

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
