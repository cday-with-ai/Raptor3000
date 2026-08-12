import { describe, it, expect } from 'vitest';
import { ChatEventType, makeChatEvent } from '@raptor3000/shared';
import {
  CHAT_COLOR_AUTO,
  chatColorFor,
  lineBody,
  listOwnerFrom,
  rowAction,
} from '../chatFormat.js';
import { DEFAULT_PREFERENCES } from '../preferences.js';

/**
 * Chat display formatting (Carson's 2026-08-12 batch): own-echo as a
 * channel line, Maciejg decode at display time, per-type colors as
 * preferences, and server-list rows as click actions.
 */

const ev = (type: (typeof ChatEventType)[keyof typeof ChatEventType], fields = {}) =>
  makeChatEvent(type, '', fields);

describe('lineBody', () => {
  it('renders your own channel send like an incoming line', () => {
    const e = ev(ChatEventType.OUTBOUND, { message: 'tell 39 chessascent.app is back' });
    expect(lineBody(e, 'cday')).toBe('cday(39): chessascent.app is back');
  });

  it('falls back to the > echo without a handle or for non-channel sends', () => {
    const e = ev(ChatEventType.OUTBOUND, { message: 'tell 39 hi' });
    expect(lineBody(e, null)).toBe('> tell 39 hi');
    const person = ev(ChatEventType.OUTBOUND, { message: 'tell alice hi' });
    expect(lineBody(person, 'cday')).toBe('> tell alice hi');
  });

  it('decodes Maciejg entities at display time — hex and decimal', () => {
    const e = ev(ChatEventType.CHANNEL_TELL, {
      source: 'domino',
      channel: '39',
      message: '$5 in 1989&#8230; now &#x263A;',
    });
    expect(lineBody(e, null)).toBe('domino(39): $5 in 1989… now ☺');
  });
});

describe('chatColorFor', () => {
  it("auto resolves to the stock palette per type", () => {
    const e = ev(ChatEventType.CHANNEL_TELL, { channel: '39' });
    expect(chatColorFor(e, DEFAULT_PREFERENCES)).toBe(CHAT_COLOR_AUTO.channel);
  });

  it('a preference override wins', () => {
    const e = ev(ChatEventType.TELL, { source: 'alice' });
    expect(
      chatColorFor(e, { ...DEFAULT_PREFERENCES, chatColorTell: '#123456' }),
    ).toBe('#123456');
  });

  it('unknown types use the theme foreground', () => {
    expect(chatColorFor(ev(ChatEventType.UNKNOWN), DEFAULT_PREFERENCES)).toBe('var(--fg)');
  });
});

describe('rowAction', () => {
  it('recognizes a games-list row → observe', () => {
    const a = rowAction(' 22 2036 pikozrout   1638 walpurti  [ sr 15  10]   2:24 -  1:51 (39-39) W: 15', null);
    expect(a?.command).toBe('observe 22');
  });

  it('recognizes a history row → examine, needs the list owner', () => {
    const line = ' 1: - 22 W  1291 CDay        [ br  5  12] B23 Res Aug 12, 2026';
    expect(rowAction(line, 'CDay')?.command).toBe('examine CDay 1');
    expect(rowAction(line, null)).toBeNull();
  });

  it('recognizes a journal row → examine %slot', () => {
    expect(rowAction('%01: + 33 W 1291 CDay ...', 'cday')?.command).toBe('examine cday %01');
  });

  it('leaves ordinary chat alone', () => {
    expect(rowAction('blore(39): 22 33 [ nothing ]', null)).toBeNull();
    expect(rowAction('some 22 random text', null)).toBeNull();
  });
});

describe('listOwnerFrom', () => {
  it('reads the owner off history/journal headers', () => {
    expect(listOwnerFrom('History for GuestXYZW:')).toBe('GuestXYZW');
    expect(listOwnerFrom('Journal for cday:')).toBe('cday');
    expect(listOwnerFrom('blore(39): History for me')).toBeNull();
  });
});
