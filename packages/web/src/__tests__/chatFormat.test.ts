import { describe, it, expect } from 'vitest';
import { ChatEventType, makeChatEvent } from '@raptor3000/shared';
import {
  CHAT_COLOR_AUTO,
  chatColorFor,
  gameLineKind,
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

  it("shorthand tells route like full ones — Carson's t-39-went-to-main bug", () => {
    const e = ev(ChatEventType.OUTBOUND, { message: 't 39 short form works' });
    expect(lineBody(e, 'cday')).toBe('cday(39): short form works');
    const x = ev(ChatEventType.OUTBOUND, { message: 'xtell 39 also works' });
    expect(lineBody(x, 'cday')).toBe('cday(39): also works');
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

describe('game line colors (2026-08-12)', () => {
  const START = '{Game 15 (GuestHXKW vs. GuestBQHN) Creating unrated blitz match.}';
  const END = '{Game 15 (GuestHXKW vs. GuestBQHN) GuestHXKW checkmated} 0-1';

  it('classifies start and end lines from UNKNOWN text', () => {
    expect(gameLineKind(START)).toBe('gameStart');
    expect(gameLineKind(END)).toBe('gameEnd');
    expect(gameLineKind('GuestX tells you: {Game 5 is fun}')).toBeNull();
  });

  it('end wins when a chunk carries both', () => {
    expect(gameLineKind(START + '\n' + END)).toBe('gameEnd');
  });

  it('colors CHALLENGE and game lines through their own prefs', () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      chatColorChallenge: '#123456',
      chatColorGameEnd: '#654321',
    };
    const challenge = ev(ChatEventType.CHALLENGE, { message: 'GuestX challenges you' });
    expect(chatColorFor(challenge, prefs)).toBe('#123456');
    const endEvt = ev(ChatEventType.UNKNOWN, { message: END });
    expect(chatColorFor(endEvt, prefs)).toBe('#654321');
    const startEvt = ev(ChatEventType.UNKNOWN, { message: START });
    expect(chatColorFor(startEvt, prefs)).toBe('var(--chat-game-start)');
  });
});

describe('sought table rows (2026-08-12)', () => {
  it('links every ad shape from the live capture to play N', () => {
    const rows = [
      ['  9 ++++ guestHELL           7   0 unrated blitz                  0-9999 f', '9'],
      [' 12 ++++ GuestDVKP           5   0 unrated suicide                0-9999 ', '12'],
      [' 14 ++++ GuestFDXH          15   0 unrated standard   [black]     0-9999 ', '14'],
      [' 37 1927 GriffyJr(C)         2  12 unrated blitz                  0-9999 ', '37'],
      [' 40 1712P Newbie             3   0 rated crazywild/x              1200-1800 m', '40'],
    ] as const;
    for (const [line, n] of rows) {
      expect(rowAction(line, null)?.command, line).toBe(`play ${n}`);
    }
  });

  it('ignores the footer and ordinary numbered chat', () => {
    expect(rowAction('7 ads displayed.', null)).toBeNull();
    expect(rowAction('  5 people are rated higher than you', null)).toBeNull();
  });

  it('games rows still observe, not play', () => {
    const games =
      ' 22 1739 CDay        1683 GriffyJr   [ br  5  12]   4:11 -  3:47 (34-34) W: 18';
    expect(rowAction(games, null)?.command).toBe('observe 22');
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

describe('seek rows (2026-08-12)', () => {
  it('makes a seek ad a play-N click target', () => {
    const a = rowAction('GuestLTND (++++) seeking 15 0 unrated standard ("play 38" to respond)', null);
    expect(a?.command).toBe('play 38');
  });

  it('ignores chat that merely quotes the phrase shape without the tail', () => {
    expect(rowAction('someone said seeking 15 0 games are fun', null)).toBeNull();
  });
});
