import { describe, it, expect } from 'vitest';
import { FicsParser } from '../FicsParser.js';
import { defaultChatParsers } from '../defaultParsers.js';
import { ChatEventType } from '../../events/ChatEventType.js';

/**
 * Real-shape traffic.
 *
 * Every test in parsers.test.ts feeds a bare line. Nothing FICS sends is a
 * bare line. Blocks begin `\n\r` (the connector normalizes that to `\n`) and
 * end with a `fics% ` prompt, and because parseStream flushes at the last
 * newline, that prompt arrives glued to the front of the *next* chunk. Every
 * `^`-anchored parser in the chain missed all three shapes, and the misses
 * were invisible because UNKNOWN still prints in the console.
 *
 * Raptor survives this two ways, both of which our port had dropped: each
 * chat parser opens with `text = text.trim()`, and IcsConnector.parseMessage
 * runs filterTrailingPrompts before the chain ever sees the text.
 *
 * These cases pin all four shapes for all 22 chat parsers. If someone adds a
 * parser and forgets the trim, the table is where it fails.
 */

const parser = new FicsParser({ chatParsers: defaultChatParsers() });

interface Case {
  what: string;
  line: string;
  type: ChatEventType;
  source?: string;
  channel?: string;
  gameId?: string;
}

const CASES: Case[] = [
  {
    what: 'PartnerTell',
    line: 'GMBob (your partner) tells you: drop knight h4',
    type: ChatEventType.PARTNER_TELL,
    source: 'GMBob',
  },
  { what: 'Told', line: '(told GuestABCD)', type: ChatEventType.TOLD, source: 'GuestABCD' },
  {
    what: 'ChannelTell',
    line: 'GMBob(SR)(GM)(50): move your rook',
    type: ChatEventType.CHANNEL_TELL,
    source: 'GMBob',
    channel: '50',
  },
  {
    what: 'Cshout',
    line: 'GuestABCD c-shouts: hello chess world',
    type: ChatEventType.CSHOUT,
    source: 'GuestABCD',
  },
  {
    what: 'Shout',
    line: 'GuestABCD shouts: anyone for bughouse?',
    type: ChatEventType.SHOUT,
    source: 'GuestABCD',
  },
  {
    what: 'Shout (emote)',
    line: '--> GuestABCD looks around',
    type: ChatEventType.SHOUT,
    source: 'GuestABCD',
  },
  {
    what: 'Kibitz',
    line: 'GuestABCD(1234)[42] kibitzes: nice move!',
    type: ChatEventType.KIBITZ,
    source: 'GuestABCD',
    gameId: '42',
  },
  {
    what: 'Tell',
    line: 'GuestABCD tells you: hi there',
    type: ChatEventType.TELL,
    source: 'GuestABCD',
  },
  {
    what: 'Tell (in-game say)',
    line: 'GuestABCD says: good luck',
    type: ChatEventType.TELL,
    source: 'GuestABCD',
  },
  {
    what: 'Whisper',
    line: 'GuestABCD(1234)[17] whispers: watch the knight',
    type: ChatEventType.WHISPER,
    source: 'GuestABCD',
    gameId: '17',
  },
  {
    what: 'QTell',
    line: ':TD-bot announcement: new tournament starting',
    type: ChatEventType.QTELL,
  },
  {
    what: 'Challenge',
    line: 'Challenge: GuestXYZ (----) GuestABC (----) unrated blitz 5 0.',
    type: ChatEventType.CHALLENGE,
  },
  {
    what: 'PartnershipCreated (form A)',
    line: "You agree to be GMBob's partner.",
    type: ChatEventType.PARTNERSHIP_CREATED,
    source: 'GMBob',
  },
  {
    what: 'PartnershipCreated (form B)',
    line: 'GuestABCD agrees to be your partner.',
    type: ChatEventType.PARTNERSHIP_CREATED,
    source: 'GuestABCD',
  },
  {
    what: 'PartnershipEnded',
    line: 'Your partner has ended partnership.',
    type: ChatEventType.PARTNERSHIP_DESTROYED,
  },
  {
    what: 'Following',
    line: "You will now be following pindik's games.",
    type: ChatEventType.FOLLOWING,
    source: 'pindik',
  },
  {
    what: 'NotFollowing',
    line: "You will not follow any player's games.",
    type: ChatEventType.NOT_FOLLOWING,
  },
  {
    what: 'DrawOffered',
    line: 'GuestABCD offers you a draw.',
    type: ChatEventType.DRAW_REQUEST,
  },
  {
    what: 'AbortRequested',
    line: 'GuestABCD would like to abort the game; type "abort" to accept.',
    type: ChatEventType.ABORT_REQUEST,
  },
  {
    what: 'History',
    line: 'History for GuestABCD:',
    type: ChatEventType.HISTORY,
    source: 'GuestABCD',
  },
  {
    what: 'Journal',
    line: 'Journal for GuestABCD:',
    type: ChatEventType.JOURNAL,
    source: 'GuestABCD',
  },
  {
    what: 'Finger',
    line: 'Finger of GuestABCD(U):',
    type: ChatEventType.FINGER,
    source: 'GuestABCD',
  },
  {
    what: 'BugWhoAll',
    line:
      'Bughouse games in progress\n...\n. (*) indicates system administrator.',
    type: ChatEventType.BUGWHO_ALL,
  },
  {
    what: 'Notification (arrival)',
    line: 'Notification: GuestABCD has arrived.',
    type: ChatEventType.NOTIFICATION_ARRIVAL,
    source: 'GuestABCD',
  },
  {
    what: 'Notification (departure)',
    line: 'Notification: GuestABCD has departed.',
    type: ChatEventType.NOTIFICATION_DEPARTURE,
    source: 'GuestABCD',
  },
  {
    what: 'Variables',
    line: 'Variable settings of GuestABCD:',
    type: ChatEventType.VARIABLES,
    source: 'GuestABCD',
  },
  {
    what: 'Ping',
    line: 'Average ping time for GuestABCD is 42ms.',
    type: ChatEventType.PING_RESPONSE,
    source: 'GuestABCD',
  },
];

/** The four shapes the same message actually arrives in. */
function shapesOf(line: string): Array<{ name: string; chunk: string }> {
  return [
    { name: 'bare line', chunk: line },
    { name: 'leading newline (real block start)', chunk: '\n' + line },
    { name: 'block with trailing prompt', chunk: '\n' + line + '\nfics% ' },
    { name: 'buffered prompt glued to the front', chunk: 'fics% \n' + line },
  ];
}

describe('real-shape traffic reaches the right parser', () => {
  for (const c of CASES) {
    for (const shape of shapesOf(c.line)) {
      it(`${c.what}: ${shape.name}`, () => {
        const events = parser.parse(shape.chunk);
        expect(events).toHaveLength(1);
        const e = events[0];
        expect(e.type).toBe(c.type);
        if (c.source !== undefined) expect(e.source).toBe(c.source);
        if (c.channel !== undefined) expect(e.channel).toBe(c.channel);
        if (c.gameId !== undefined) expect(e.gameId).toBe(c.gameId);
      });
    }
  }
});

describe('each parser is correct on its own, not only via FicsParser', () => {
  // The trim belongs in the parsers, not the orchestrator: a parser called
  // directly on a raw chunk must still work. This is the assertion that would
  // fail if someone "simplified" the 22 trims into one call in FicsParser.
  const parsers = defaultChatParsers();

  for (const c of CASES) {
    it(`${c.what} matches with a leading newline when called directly`, () => {
      const bare = parsers.map(pp => pp.parse(c.line)).find(Boolean);
      const wrapped = parsers.map(pp => pp.parse('\n' + c.line + '\n')).find(Boolean);
      expect(bare).toBeTruthy();
      expect(wrapped).toBeTruthy();
      expect(wrapped!.type).toBe(bare!.type);
      expect(wrapped!.source).toBe(bare!.source);
      expect(wrapped!.message).toBe(bare!.message);
    });
  }
});

describe('prompt filtering (Raptor filterTrailingPrompts)', () => {
  it('strips a stack of buffered prompts, not just one', () => {
    // Quiet server: several prompts accumulate before the next real block.
    const e = parser.parse('fics% fics% fics% \nGuestA tells you: hi')[0];
    expect(e.type).toBe(ChatEventType.TELL);
    expect(e.source).toBe('GuestA');
  });

  it('a chunk that is only a prompt produces no event', () => {
    expect(parser.parse('fics% ')).toHaveLength(0);
    expect(parser.parse('\nfics% ')).toHaveLength(0);
  });

  it('does not eat a prompt-like string mid-message', () => {
    const e = parser.parse('\nGuestA tells you: type fics% to continue\n')[0];
    expect(e.type).toBe(ChatEventType.TELL);
    expect(e.message).toBe('type fics% to continue');
  });

  it('keeps the trailing prompt out of the event text', () => {
    const e = parser.parse('\nGuestA tells you: hi\nfics% ')[0];
    expect(e.message).toBe('hi');
    expect(e.raw).not.toContain('fics%');
  });
});

describe('FICS line-wrap continuations rejoin before parsing (2026-08-12)', () => {
  const p = new FicsParser({ chatParsers: defaultChatParsers() });

  it('a wrapped channel tell parses as one CHANNEL_TELL with the full text', () => {
    const events = p.parse(
      '\natlasNTST(39): strangely i thought we had 3-repeat in game. but \n\\   draw was not given\n',
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ChatEventType.CHANNEL_TELL);
    expect(events[0].message).toBe(
      'strangely i thought we had 3-repeat in game. but draw was not given',
    );
  });

  it('a URL split mid-token by the wrap reassembles without a seam', () => {
    const events = p.parse(
      '\nblore(39): see https://example.com/very/long/pa\n\\   th?q=1 for details\n',
    );
    expect(events[0].message).toContain('https://example.com/very/long/path?q=1');
  });

  it('a lone backslash line without the three-space marker is untouched', () => {
    const events = p.parse('\nsomething with a \\ backslash\n');
    expect(events[0].raw).toContain('\\ backslash');
  });
});

describe('<pt> pending-offer lines are eaten (2026-08-12)', () => {
  it('never reaches chat, parsed or not', () => {
    const p = new FicsParser({ chatParsers: defaultChatParsers() });
    const events = p.parse('\n<pt> 7 w=GuestNHJJ t=match p=raptortest (----) GuestNHJJ (----) unrated standard 15 0\n');
    expect(events.filter(e => e.raw.includes('<pt>'))).toHaveLength(0);
  });
});
