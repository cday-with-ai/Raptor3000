import { describe, it, expect } from 'vitest';
import { FicsParser } from '../FicsParser.js';
import {
  defaultChatParsers,
  defaultGameLineParsers,
  defaultChunkParsers,
} from '../defaultParsers.js';
import { ChatEventType } from '../../events/ChatEventType.js';
import { GameService } from '../../services/GameService.js';

const parser = new FicsParser({ chatParsers: defaultChatParsers() });
// Single-line convenience: the new parse() returns ChatEvent[]; most tests
// expect one event so we take the first.
const p = (s: string) => parser.parse(s)[0];

describe('TellEventParser', () => {
  it('classifies a personal tell', () => {
    const e = p('GuestABCD tells you: hi there');
    expect(e.type).toBe(ChatEventType.TELL);
    expect(e.source).toBe('GuestABCD');
    expect(e.message).toBe('hi there');
  });
  it('strips titles on tells', () => {
    const e = p('GMBob(*)(GM) tells you: hello');
    expect(e.type).toBe(ChatEventType.TELL);
    expect(e.source).toBe('GMBob');
  });

  // The in-game `say` form. Raptor's TellEventParser.java matches "says:" as
  // its first branch and emits ChatType.TELL; this port had only "tells you:",
  // so every `say` from an opponent fell through the chain to UNKNOWN.
  it('classifies an in-game say as a tell', () => {
    const e = p('GuestABCD says: good luck');
    expect(e.type).toBe(ChatEventType.TELL);
    expect(e.source).toBe('GuestABCD');
    expect(e.message).toBe('good luck');
  });
  it('strips titles on says', () => {
    const e = p('GMBob(*)(GM) says: your move');
    expect(e.type).toBe(ChatEventType.TELL);
    expect(e.source).toBe('GMBob');
    expect(e.message).toBe('your move');
  });
  it('a partner say is still a PARTNER_TELL, not a TELL', () => {
    // PartnerTellEventParser sits ahead of TellEventParser in the chain and
    // keys on the literal `(your` token, so adding `says:` here cannot steal
    // the bughouse form — which matters because `say` in bughouse is
    // delivered to the partner too.
    const e = p('GMBob (your partner) says: drop knight h4');
    expect(e.type).toBe(ChatEventType.PARTNER_TELL);
    expect(e.source).toBe('GMBob');
  });
  it('does not claim other verbs that end in a colon', () => {
    // Guards the widened alternation: `(?:tells you|says):` must not become
    // something that also swallows shouts, kibitzes or whispers.
    expect(p('GuestABCD shouts: hello').type).toBe(ChatEventType.SHOUT);
    expect(p('GuestABCD(1234)[42] kibitzes: nice').type).toBe(ChatEventType.KIBITZ);
    expect(p('GuestABCD(1234)[17] whispers: watch').type).toBe(ChatEventType.WHISPER);
  });
});

describe('ChannelTellEventParser', () => {
  it('classifies plain channel tell', () => {
    const e = p('GuestABCD(50): hi');
    expect(e.type).toBe(ChatEventType.CHANNEL_TELL);
    expect(e.channel).toBe('50');
  });
  it('classifies channel tell with titles', () => {
    const e = p('GMBob(SR)(GM)(50): move your rook');
    expect(e.type).toBe(ChatEventType.CHANNEL_TELL);
    expect(e.channel).toBe('50');
    expect(e.source).toBe('GMBob');
  });
});

describe('ShoutEventParser', () => {
  it('classifies a shout', () => {
    const e = p('GuestABCD shouts: anyone for bughouse?');
    expect(e.type).toBe(ChatEventType.SHOUT);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('CshoutEventParser', () => {
  it('classifies a c-shout', () => {
    const e = p('GuestABCD c-shouts: hello chess world');
    expect(e.type).toBe(ChatEventType.CSHOUT);
    expect(e.source).toBe('GuestABCD');
  });
  it('strips titles on c-shouts', () => {
    const e = p('GMBob(*) c-shouts: hi');
    expect(e.source).toBe('GMBob');
  });
});

describe('KibitzEventParser', () => {
  it('classifies kibitz and extracts gameId', () => {
    const e = p('GuestABCD(1234)[42] kibitzes: nice move!');
    expect(e.type).toBe(ChatEventType.KIBITZ);
    expect(e.gameId).toBe('42');
    expect(e.source).toBe('GuestABCD');
  });
});

describe('WhisperEventParser', () => {
  it('classifies whisper and extracts gameId', () => {
    const e = p('GuestABCD(1234)[17] whispers: watch the knight');
    expect(e.type).toBe(ChatEventType.WHISPER);
    expect(e.gameId).toBe('17');
    expect(e.source).toBe('GuestABCD');
  });
});

describe('PartnerTellEventParser', () => {
  it('classifies a partner tell', () => {
    const e = p('GMBob (your partner) tells you: drop knight h4');
    expect(e.type).toBe(ChatEventType.PARTNER_TELL);
    expect(e.source).toBe('GMBob');
  });
});

describe('QTellParser', () => {
  it('classifies lines starting with colon as QTELL', () => {
    const e = p(':TD-bot announcement: new tournament starting');
    expect(e.type).toBe(ChatEventType.QTELL);
  });
});

describe('ToldEventParser', () => {
  it('classifies (told NAME)', () => {
    const e = p('(told GuestABCD)');
    expect(e.type).toBe(ChatEventType.TOLD);
    expect(e.source).toBe('GuestABCD');
  });
  it('suppresses channel-told like (told 50)', () => {
    const e = p('(told 50)');
    expect(e.type).toBe(ChatEventType.UNKNOWN);
  });
});

describe('ChallengeEventParser', () => {
  it('classifies challenges', () => {
    const e = p('Challenge: GuestXYZ (----) GuestABC (----) unrated blitz 5 0.');
    expect(e.type).toBe(ChatEventType.CHALLENGE);
  });
});

describe('DrawOfferedEventParser', () => {
  it('classifies draw offers', () => {
    const e = p('GuestABCD offers you a draw.');
    expect(e.type).toBe(ChatEventType.DRAW_REQUEST);
  });
});

describe('AbortRequestedEventParser', () => {
  it('classifies abort requests', () => {
    const e = p(
      'GuestABCD would like to abort the game; type "abort" to accept.',
    );
    expect(e.type).toBe(ChatEventType.ABORT_REQUEST);
  });
});

describe('PartnershipCreatedEventParser', () => {
  it('classifies form A (you agree)', () => {
    const e = p("You agree to be GMBob's partner.");
    expect(e.type).toBe(ChatEventType.PARTNERSHIP_CREATED);
    expect(e.source).toBe('GMBob');
  });
  it('classifies form B (they agree)', () => {
    const e = p('GuestABCD agrees to be your partner.');
    expect(e.type).toBe(ChatEventType.PARTNERSHIP_CREATED);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('PartnershipEndedEventParser', () => {
  it('classifies "you no longer have"', () => {
    const e = p('You no longer have a bughouse partner.');
    expect(e.type).toBe(ChatEventType.PARTNERSHIP_DESTROYED);
  });
  it('classifies "your partner has ended"', () => {
    const e = p('Your partner has ended partnership.');
    expect(e.type).toBe(ChatEventType.PARTNERSHIP_DESTROYED);
  });
});

describe('FollowingEventParser', () => {
  it("classifies 'now be following'", () => {
    const e = p("You will now be following pindik's games.");
    expect(e.type).toBe(ChatEventType.FOLLOWING);
    expect(e.source).toBe('pindik');
  });
  it("classifies 'not follow'", () => {
    const e = p("You will not follow any player's games.");
    expect(e.type).toBe(ChatEventType.NOT_FOLLOWING);
  });
});

describe('NotificationEventParser', () => {
  it('classifies arrivals', () => {
    const e = p('Notification: GuestABCD has arrived.');
    expect(e.type).toBe(ChatEventType.NOTIFICATION_ARRIVAL);
    expect(e.source).toBe('GuestABCD');
  });
  it('classifies departures', () => {
    const e = p('Notification: GuestABCD has departed.');
    expect(e.type).toBe(ChatEventType.NOTIFICATION_DEPARTURE);
    expect(e.source).toBe('GuestABCD');
  });
  it('classifies the "isn\'t on your notify list" arrival', () => {
    const e = p("Notification: GuestABCD has arrived and isn't on your notify list.");
    expect(e.type).toBe(ChatEventType.NOTIFICATION_ARRIVAL);
    expect(e.source).toBe('GuestABCD');
  });
  it('classifies the "isn\'t on your notify list" departure', () => {
    const e = p("Notification: GuestABCD has departed and isn't on your notify list.");
    expect(e.type).toBe(ChatEventType.NOTIFICATION_DEPARTURE);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('FingerEventParser', () => {
  it('classifies finger output', () => {
    const e = p('Finger of GuestABCD(U):');
    expect(e.type).toBe(ChatEventType.FINGER);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('HistoryEventParser', () => {
  it('classifies history output', () => {
    const e = p('History for GuestABCD:');
    expect(e.type).toBe(ChatEventType.HISTORY);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('JournalEventParser', () => {
  it('classifies journal output', () => {
    const e = p('Journal for GuestABCD:');
    expect(e.type).toBe(ChatEventType.JOURNAL);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('VariablesEventParser', () => {
  it('classifies variables output', () => {
    const e = p('Variable settings of GuestABCD:');
    expect(e.type).toBe(ChatEventType.VARIABLES);
    expect(e.source).toBe('GuestABCD');
  });
});

describe('BugWhoAllEventParser', () => {
  it('classifies bugwho output (full block)', () => {
    const block =
      'Bughouse games in progress\n...\n. (*) indicates system administrator.';
    const events = parser.parse(block);
    // bugwho might be routed via chunk-parser plug-in; if not, it'll match
    // BugWhoAllEventParser from the chat chain.
    expect(events[0].type).toBe(ChatEventType.BUGWHO_ALL);
  });
});

describe('PingEventParser', () => {
  it('classifies ping response with pingMs', () => {
    const e = p('Average ping time for GuestABCD is 42ms.');
    expect(e.type).toBe(ChatEventType.PING_RESPONSE);
    expect(e.source).toBe('GuestABCD');
    expect(e.pingMs).toBe(42);
  });
});

describe('FicsParser (priority ordering + chunking)', () => {
  it('falls back to UNKNOWN for unrecognized lines', () => {
    const e = p('*** something weird the server sent');
    expect(e.type).toBe(ChatEventType.UNKNOWN);
  });
  it('returns a single event for a one-line chunk', () => {
    const events = parser.parse('GuestA tells you: hi');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ChatEventType.TELL);
  });

  it('parseStream flushes on newlines and buffers partials', () => {
    const p2 = new FicsParser({ chatParsers: defaultChatParsers() });
    // First half of a line — no newline yet.
    expect(p2.parseStream('GuestA tells y')).toHaveLength(0);
    // Complete it — the whole line fires now.
    const events = p2.parseStream('ou: hi\n');
    expect(events[0].type).toBe(ChatEventType.TELL);
    expect(events[0].message).toBe('hi');
  });

  it('finds a tell that shares its chunk with the (told X) receipt', () => {
    // The silent-tell bug of 2026-08-14. Telling someone comes back as
    // the tell AND its receipt in one server write; the chat parsers are
    // anchored per line, so the receipt defeated all of them and the
    // whole block — real tell included — fell out as one UNKNOWN. No
    // TELL event meant no alert sound and no color.
    const events = parser.parse('\nGuestJLGN(U) tells you: selftest\n(told GuestJLGN)');
    const tell = events.find(e => e.type === ChatEventType.TELL);
    expect(tell).toBeDefined();
    expect(tell!.message).toBe('selftest');
    expect(tell!.source).toBe('GuestJLGN');
  });

  it('leaves a block nothing recognizes as one UNKNOWN, not confetti', () => {
    // The per-line retry only commits when at least one line parses, so
    // multi-line output that is genuinely one thing (finger, MOTD) keeps
    // arriving as a single event exactly as it always did.
    const events = parser.parse('some server preamble\nnothing here parses at all');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ChatEventType.UNKNOWN);
  });

  it('suppresses prompt-only chunks', () => {
    const events = parser.parse('fics% ');
    expect(events).toHaveLength(0);
  });

  it('suppresses blank chunks', () => {
    expect(parser.parse('')).toHaveLength(0);
    expect(parser.parse('\n\n')).toHaveLength(0);
  });
});

describe('FicsParser (game events)', () => {
  function makeParser() {
    const service = new GameService();
    const events: { kind: string; args: unknown[] }[] = [];
    service.addListener({
      gameCreated: id => events.push({ kind: 'gameCreated', args: [id] }),
      gameStateChanged: (id, nm) =>
        events.push({ kind: 'gameStateChanged', args: [id, nm] }),
      droppablePiecesChanged: id =>
        events.push({ kind: 'droppablePiecesChanged', args: [id] }),
      gameInactive: id => events.push({ kind: 'gameInactive', args: [id] }),
      illegalMove: (id, m) => events.push({ kind: 'illegalMove', args: [id, m] }),
      gameMovesAdded: id => events.push({ kind: 'gameMovesAdded', args: [id] }),
      onPlayingGameStart: id => events.push({ kind: 'onPlayingGameStart', args: [id] }),
      onPlayingGameEnd: id => events.push({ kind: 'onPlayingGameEnd', args: [id] }),
      onObsGameStart: id => events.push({ kind: 'onObsGameStart', args: [id] }),
      onObsGameEnd: id => events.push({ kind: 'onObsGameEnd', args: [id] }),
      onExGameStart: id => events.push({ kind: 'onExGameStart', args: [id] }),
      onExGameEnd: id => events.push({ kind: 'onExGameEnd', args: [id] }),
    });
    const fics = new FicsParser({
      chatParsers: defaultChatParsers(),
      gameLineParsers: defaultGameLineParsers(),
      chunkParsers: defaultChunkParsers(),
      gameService: service,
    });
    return { fics, events };
  }

  it('fires gameCreated on <g1> and eats the line', () => {
    const { fics, events } = makeParser();
    const chat = fics.parse(
      '<g1> 1 p=0 t=blitz r=1 u=0,0 it=5,5 i=8,8 pt=0 rt=1586E,2100 ts=1,0',
    );
    expect(events).toEqual([{ kind: 'gameCreated', args: ['1'] }]);
    expect(chat).toHaveLength(0);
  });

  it('fires gameCreated + mode-start + gameStateChanged on first <12>', () => {
    const { fics, events } = makeParser();
    // relation=0 = OBSERVING.
    fics.parse(
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 100 A B 0 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0',
    );
    expect(events).toEqual([
      { kind: 'gameCreated', args: ['100'] },
      { kind: 'onObsGameStart', args: ['100'] },
      { kind: 'gameStateChanged', args: ['100', true] },
    ]);
  });

  it('fires onPlayingGameStart when relation=1 (my move)', () => {
    const { fics, events } = makeParser();
    fics.parse(
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 101 A B 1 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0',
    );
    expect(events.map(e => e.kind)).toEqual([
      'gameCreated',
      'onPlayingGameStart',
      'gameStateChanged',
    ]);
  });

  it('fires onExGameStart when relation=2 (examining)', () => {
    const { fics, events } = makeParser();
    fics.parse(
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 102 A B 2 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0',
    );
    expect(events.map(e => e.kind)).toEqual([
      'gameCreated',
      'onExGameStart',
      'gameStateChanged',
    ]);
  });

  it('fires mode-end when obs→examine transition occurs', () => {
    const { fics, events } = makeParser();
    // First Style12: observing (relation=0).
    fics.parse(
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 200 A B 0 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0',
    );
    events.length = 0;
    // Second Style12 for same game, now in examine mode (relation=2).
    fics.parse(
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR W 4 1 1 1 1 1 200 A B 2 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0',
    );
    // Transition order: onObsGameEnd (from recordStyle12) → gameStateChanged → onExGameStart
    expect(events.map(e => e.kind)).toEqual([
      'onObsGameEnd',
      'gameStateChanged',
      'onExGameStart',
    ]);
  });

  it('fires mode-end before generic gameInactive on game-end', () => {
    const { fics, events } = makeParser();
    // Start an observed game.
    fics.parse(
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 300 A B 0 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0',
    );
    events.length = 0;
    // End the game.
    fics.parse('{Game 300 (A vs. B) A resigns} 0-1');
    expect(events.map(e => e.kind)).toEqual([
      'onObsGameEnd',
      'gameInactive',
    ]);
  });

  it('subsequent <12> for same game only fires gameStateChanged', () => {
    const { fics, events } = makeParser();
    const s12 =
      '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 100 A B 1 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0';
    fics.parse(s12);
    events.length = 0;
    fics.parse(s12);
    expect(events).toEqual([
      { kind: 'gameStateChanged', args: ['100', true] },
    ]);
  });

  it('fires gameInactive on game-end, keeping the chat line', () => {
    const { fics, events } = makeParser();
    const chat = fics.parse('{Game 117 (raptora vs. raptorb) raptora resigns} 0-1');
    expect(events).toEqual([{ kind: 'gameInactive', args: ['117'] }]);
    expect(chat.length).toBeGreaterThan(0);
  });

  it('eats <12> lines when embedded in a large multi-line chunk', () => {
    // Prior to the fix, a chunk over 1000 chars bypassed the game-line
    // filter and let `<12>` leak to chat. Regression guard.
    const { fics } = makeParser();
    const filler = 'x'.repeat(1200);
    const chunk = `${filler}\n<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 100 A B 1 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0\n`;
    const chat = fics.parse(chunk);
    for (const e of chat) {
      expect(e.message).not.toContain('<12>');
      expect(e.raw).not.toContain('<12>');
    }
  });

  it('drops malformed <12> / <g1> / <b1> lines instead of leaking to chat', () => {
    // A line that STARTS with a control marker but has a broken body
    // (e.g. truncated / unknown ivariable combo) should still be eaten.
    const { fics } = makeParser();
    const chat = fics.parse('<12>truncated garbage\n<g1> 1 malformed\n<b1> busted\n');
    for (const e of chat) {
      expect(e.message).not.toContain('<12>');
      expect(e.message).not.toContain('<g1>');
      expect(e.message).not.toContain('<b1>');
    }
  });
});
