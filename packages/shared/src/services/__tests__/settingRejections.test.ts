import { describe, it, expect } from 'vitest';
import { FicsConnector, splitSettingRejections } from '../FicsConnector.js';
import { ChatService } from '../ChatService.js';
import { GameService } from '../GameService.js';
import { FicsParser } from '../../parsers/FicsParser.js';
import {
  defaultChatParsers,
  defaultGameLineParsers,
  defaultChunkParsers,
} from '../../parsers/defaultParsers.js';
import { ChatEventType } from '../../events/ChatEventType.js';
import type { ChatEvent } from '../../events/ChatEvent.js';

/**
 * Setting-rejection surfacing.
 *
 * Both 2026-07-26 login bugs were reported by FICS in plain English during
 * bootstrap — `Cannot alter: Interface setting locked.` (iset lock ordered
 * too early) and `Bad value given for variable height` (1000 out of range)
 * — and filed as ordinary chat, where nothing noticed them for three
 * months. These tests pin the fix: those lines must surface as INTERNAL
 * errors, must not reach chat as UNKNOWN, and must NOT be intercepted when
 * a person merely quotes the phrase in a tell.
 */

function makeSession() {
  const chatService = new ChatService();
  const gameService = new GameService();
  const parser = new FicsParser({
    chatParsers: defaultChatParsers(),
    gameLineParsers: defaultGameLineParsers(),
    chunkParsers: defaultChunkParsers(),
    gameService,
  });
  const connector = new FicsConnector({ chatService, gameService, parser });

  const chat: ChatEvent[] = [];
  chatService.addMainConsoleListener({
    id: 'test-console',
    accepts: () => true,
    handle: e => chat.push(e),
  });

  // handleRaw is the WebSocket onmessage path; private, reached by cast.
  const feed = (raw: string) =>
    (connector as unknown as { handleRaw(r: string): void }).handleRaw(raw);

  return { feed, chat };
}

describe('setting rejections surface as errors, not chat', () => {
  it('turns "Cannot alter:" into an INTERNAL error and keeps it out of chat', () => {
    const { feed, chat } = makeSession();
    feed('\n\rCannot alter: Interface setting locked.\n\rfics% ');

    const internal = chat.filter(e => e.type === ChatEventType.INTERNAL);
    expect(internal).toHaveLength(1);
    expect(internal[0].message).toBe(
      'FICS rejected a setting: Cannot alter: Interface setting locked.',
    );
    expect(chat.some(e => e.type === ChatEventType.UNKNOWN)).toBe(false);
  });

  it('turns "Bad value given for variable" into an INTERNAL error', () => {
    const { feed, chat } = makeSession();
    feed('\n\rBad value given for variable "height".\n\rfics% ');

    const internal = chat.filter(e => e.type === ChatEventType.INTERNAL);
    expect(internal).toHaveLength(1);
    expect(internal[0].message).toBe(
      'FICS rejected a setting: Bad value given for variable "height".',
    );
    expect(chat.some(e => e.type === ChatEventType.UNKNOWN)).toBe(false);
  });

  it('catches a rejection glued to a buffered prompt (fics% Cannot alter:)', () => {
    const { feed, chat } = makeSession();
    // The known dangerous shape: a block arriving without its leading \n\r
    // lands on the buffered prompt and produces a single prompt-prefixed line.
    feed('fics% Cannot alter: Interface setting locked.\n\r');

    const internal = chat.filter(e => e.type === ChatEventType.INTERNAL);
    expect(internal).toHaveLength(1);
    expect(internal[0].message).toContain('Cannot alter:');
    expect(chat.some(e => e.type === ChatEventType.UNKNOWN)).toBe(false);
  });

  it('splits a mixed chunk: the rejection errors, the rest still reaches chat', () => {
    const { feed, chat } = makeSession();
    feed(
      '\n\rCannot alter: Interface setting locked.\n\r' +
        'You will not see seek ads.\n\rfics% ',
    );

    const internal = chat.filter(e => e.type === ChatEventType.INTERNAL);
    expect(internal).toHaveLength(1);
    const unknown = chat.filter(e => e.type === ChatEventType.UNKNOWN);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('You will not see seek ads.');
    expect(unknown[0].message).not.toContain('Cannot alter:');
  });

  it('leaves a parsed tell quoting the phrase alone', () => {
    const { feed, chat } = makeSession();
    feed('SomePlayer tells you: Bad value given for variable "height".\n');

    expect(chat.filter(e => e.type === ChatEventType.INTERNAL)).toHaveLength(0);
    const tells = chat.filter(e => e.type === ChatEventType.TELL);
    expect(tells).toHaveLength(1);
    expect(tells[0].source).toBe('SomePlayer');
  });

  it('never fires on a mid-line quote in a real-shaped block', () => {
    const { feed, chat } = makeSession();
    // Real block shape — leading \n\r, trailing prompt. This used to defeat
    // the anchored TELL parser and land as UNKNOWN; since the per-parser trim
    // and prompt filter it classifies as a TELL, which is the stronger
    // guarantee: the phrase never reaches the interceptor at all.
    feed(
      '\n\rSomePlayer tells you: Bad value given for variable "height".\n\rfics% ',
    );

    expect(chat.filter(e => e.type === ChatEventType.INTERNAL)).toHaveLength(0);
    expect(chat.filter(e => e.type === ChatEventType.UNKNOWN)).toHaveLength(0);
    const tells = chat.filter(e => e.type === ChatEventType.TELL);
    expect(tells).toHaveLength(1);
    expect(tells[0].source).toBe('SomePlayer');
  });

  it('never fires on a mid-line quote inside an UNKNOWN chunk', () => {
    const { feed, chat } = makeSession();
    // Server text no chat parser claims, quoting the phrase mid-line. This is
    // the case the interceptor actually has to be careful about: it sees the
    // chunk, and only line-anchoring keeps it from firing.
    feed(
      '\n\rYour seek matched: Bad value given for variable "height".\n\rfics% ',
    );

    expect(chat.filter(e => e.type === ChatEventType.INTERNAL)).toHaveLength(0);
    const unknown = chat.filter(e => e.type === ChatEventType.UNKNOWN);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('Bad value given for variable');
  });

  it('splitSettingRejections leaves non-matching chunks verbatim', () => {
    const chunk = 'Game 95: GuestFOO (++++) GuestBAR (++++) unrated blitz 3 0\n';
    expect(splitSettingRejections(chunk)).toEqual({
      rejections: [],
      remainder: chunk,
    });
  });
});
