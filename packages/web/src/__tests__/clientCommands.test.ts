import { describe, it, expect } from 'vitest';
import {
  censorEditIn,
  makeListClearer,
  makeListCollector,
  runClientCommand,
  type ClientCommandHost,
} from '../clientCommands.js';

/**
 * Client script commands (2026-08-12), semantics from Raptor's alias
 * classes: `clear censor`/`clear noplay` harvest the `=list` reply and
 * remove each entry; `+tab` opens tabs locally. The harvest state
 * machine is the part worth pinning — FICS replies arrive line by line.
 */

function makeHost() {
  const sent: string[] = [];
  const announced: string[] = [];
  const tabs: string[] = [];
  let harvest: ((m: string) => boolean) | null = null;
  const host: ClientCommandHost = {
    send: c => void sent.push(c),
    announce: m => void announced.push(m),
    addTab: t => void tabs.push(t),
    startHarvest: f => {
      harvest = f;
    },
  };
  return {
    host,
    sent,
    announced,
    tabs,
    feed: (m: string) => {
      if (harvest && harvest(m)) harvest = null;
    },
    harvesting: () => harvest !== null,
  };
}

describe('clear censor / clear noplay', () => {
  it('sends =censor, then -censor for each name across split lines', () => {
    const h = makeHost();
    expect(runClientCommand('clear censor', h.host)).toBe(true);
    expect(h.sent).toEqual(['=censor']);

    h.feed('-- censor list: 3 names --');
    h.feed('BadSport annoyer');
    expect(h.sent).toEqual(['=censor', '-censor BadSport', '-censor annoyer']);
    expect(h.harvesting()).toBe(true);

    h.feed('ThirdGuy');
    expect(h.sent).toContain('-censor ThirdGuy');
    expect(h.harvesting()).toBe(false);
    expect(h.announced.some(m => m.includes('Removed 3 names'))).toBe(true);
  });

  it('handles names on the header line itself (chunked delivery)', () => {
    const h = makeHost();
    runClientCommand('clear noplay', h.host);
    h.feed('-- noplay list: 2 names --\nfoeOne foeTwo');
    expect(h.sent).toEqual(['=noplay', '-noplay foeOne', '-noplay foeTwo']);
    expect(h.harvesting()).toBe(false);
  });

  it('an empty list finishes immediately with a friendly line', () => {
    const h = makeHost();
    runClientCommand('clear censor', h.host);
    h.feed('-- censor list: 0 names --');
    expect(h.harvesting()).toBe(false);
    expect(h.sent).toEqual(['=censor']);
    expect(h.announced.some(m => m.includes('already empty'))).toBe(true);
  });

  it('ignores unrelated chatter before the header and non-name tokens after', () => {
    const clearer = makeListClearer('censor', {
      send: () => undefined,
      announce: () => undefined,
    });
    expect(clearer('GuestX tells you: hi')).toBe(false); // no header yet
    expect(clearer('-- noplay list: 5 names --')).toBe(false); // wrong list
  });
});

describe('the flood failure mode (2026-08-12)', () => {
  it('a harvester fed garbage forever gives up instead of oscillating', () => {
    const sent: string[] = [];
    const clearer = makeListClearer('censor', {
      send: c => void sent.push(c),
      announce: () => undefined,
    });
    clearer('-- censor list: 9 names --');
    // Feed it its own outbound-echo shape many times — the caller
    // filters these in production, but the valve must hold regardless.
    let done = false;
    for (let i = 0; i < 200 && !done; i++) done = clearer('-censor victim');
    expect(done).toBe(true);
    expect(sent.length).toBeLessThan(60);
  });
});

describe('+tab', () => {
  it('opens channel and person tabs locally, sending nothing', () => {
    const h = makeHost();
    expect(runClientCommand('+tab 39', h.host)).toBe(true);
    expect(runClientCommand('+tab johnthegreat', h.host)).toBe(true);
    expect(h.tabs).toEqual(['39', 'johnthegreat']);
    expect(h.sent).toEqual([]);
    expect(h.announced).toEqual([
      'Added channel tab 39.',
      'Added person tab johnthegreat.',
    ]);
  });
});

describe('everything else passes through', () => {
  it('real FICS commands are not intercepted', () => {
    const h = makeHost();
    for (const line of ['tell 39 hi', 'observe /b', '=censor', 'clear board']) {
      expect(runClientCommand(line, h.host), line).toBe(false);
    }
    expect(h.sent).toEqual([]);
  });
});

describe('makeListCollector (censor-aware backfill, 2026-08-13)', () => {
  it('collects the list silently, lowercased, across split lines', () => {
    let got: ReadonlySet<string> | null = null;
    const feed = makeListCollector('censor', names => (got = names));
    expect(feed('-- censor list: 3 names --')).toBe(false);
    expect(feed('BadSport annoyer')).toBe(false);
    expect(feed('ThirdGuy')).toBe(true);
    expect([...got!].sort()).toEqual(['annoyer', 'badsport', 'thirdguy']);
  });

  it('an empty list hands over an empty set', () => {
    let got: ReadonlySet<string> | null = null;
    makeListCollector('censor', names => (got = names))('-- censor list: 0 names --');
    expect(got!.size).toBe(0);
  });
});

describe('censorEditIn', () => {
  it('reads your own +censor/-censor sends', () => {
    expect(censorEditIn('+censor BadSport', true)).toEqual({ name: 'badsport', add: true });
    expect(censorEditIn('-censor BadSport', true)).toEqual({ name: 'badsport', add: false });
    expect(censorEditIn('tell 39 +censor jokes', true)).toBeNull();
  });

  it("reads FICS's confirmations", () => {
    expect(censorEditIn('[GriffyJr] added to your censor list.', false)).toEqual({
      name: 'griffyjr',
      add: true,
    });
    expect(censorEditIn('[GriffyJr] removed from your censor list.', false)).toEqual({
      name: 'griffyjr',
      add: false,
    });
    expect(censorEditIn('GuestX tells you: censor me', false)).toBeNull();
  });
});
