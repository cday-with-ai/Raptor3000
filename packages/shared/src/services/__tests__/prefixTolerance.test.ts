import { describe, it, expect } from 'vitest';
import { offsetAfterPrefix } from '../IcsUtils.js';
import { FicsParser } from '../../parsers/FicsParser.js';
import { defaultChatParsers } from '../../parsers/defaultParsers.js';
import { ChatEventType } from '../../events/ChatEventType.js';
import { FingerEventParser } from '../../parsers/chat/FingerEventParser.js';
import { HistoryEventParser } from '../../parsers/chat/HistoryEventParser.js';
import { JournalEventParser } from '../../parsers/chat/JournalEventParser.js';
import { VariablesEventParser } from '../../parsers/chat/VariablesEventParser.js';
import { ToldEventParser } from '../../parsers/chat/ToldEventParser.js';
import { NotificationEventParser } from '../../parsers/chat/NotificationEventParser.js';

/**
 * The leading-character tolerance the prefix parsers inherited from Raptor.
 *
 * Raptor's Finger/History/Journal/Variables/Told/Notification parsers all test
 * `text.startsWith(X) || text.startsWith(X, 1)`, because Raptor does not trim
 * before the check and the raw block it is handed can open with a newline.
 * Our port trims in every parser, so that second branch was only ever going to
 * see a character trim had already refused to remove — i.e. not whitespace —
 * and it accepted any of them: `XFinger of Bob` classified as a finger.
 *
 * `offsetAfterPrefix` now skips one *whitespace* character and nothing else,
 * and returns the offset the caller needs rather than leaving each of the six
 * to recompute it from a second `startsWith`.
 */

const parser = new FicsParser({ chatParsers: defaultChatParsers() });
const p = (s: string) => parser.parse(s)[0];

describe('offsetAfterPrefix', () => {
  it('returns the index past an exact prefix match', () => {
    expect(offsetAfterPrefix('Finger of Bob', 'Finger of ')).toBe(10);
  });

  it('returns prefix length when the text is nothing but the prefix', () => {
    expect(offsetAfterPrefix('Finger of ', 'Finger of ')).toBe(10);
  });

  it('skips one leading space and reports the shifted offset', () => {
    expect(offsetAfterPrefix(' Finger of Bob', 'Finger of ')).toBe(11);
  });

  it('skips a leading newline or tab too — trim is not the only caller', () => {
    expect(offsetAfterPrefix('\nFinger of Bob', 'Finger of ')).toBe(11);
    expect(offsetAfterPrefix('\tFinger of Bob', 'Finger of ')).toBe(11);
  });

  it('does not skip a non-whitespace character', () => {
    expect(offsetAfterPrefix('XFinger of Bob', 'Finger of ')).toBe(-1);
    expect(offsetAfterPrefix('*Finger of Bob', 'Finger of ')).toBe(-1);
  });

  it('reports no match for unrelated, empty and short text', () => {
    expect(offsetAfterPrefix('Told of Bob', 'Finger of ')).toBe(-1);
    expect(offsetAfterPrefix('', 'Finger of ')).toBe(-1);
    expect(offsetAfterPrefix('Finger', 'Finger of ')).toBe(-1);
    expect(offsetAfterPrefix(' ', 'Finger of ')).toBe(-1);
  });

  it('the offset it returns is where the payload starts, both ways', () => {
    const prefix = 'History for ';
    expect('History for Bob:'.substring(offsetAfterPrefix('History for Bob:', prefix))).toBe('Bob:');
    expect(' History for Bob:'.substring(offsetAfterPrefix(' History for Bob:', prefix))).toBe(
      'Bob:',
    );
  });
});

/**
 * Through the chain. The point of each of these is the negative: a line that
 * carries a spurious leading character is no longer one of these events.
 */
describe('spurious leading characters no longer classify', () => {
  const CASES: Array<{ what: string; line: string; was: ChatEventType }> = [
    { what: 'Finger', line: 'XFinger of GuestABCD(U):', was: ChatEventType.FINGER },
    { what: 'History', line: 'XHistory for GuestABCD:', was: ChatEventType.HISTORY },
    { what: 'Journal', line: 'XJournal for GuestABCD:', was: ChatEventType.JOURNAL },
    { what: 'Variables', line: 'XVariable settings of GuestABCD:', was: ChatEventType.VARIABLES },
    { what: 'Told', line: 'X(told GuestABCD)', was: ChatEventType.TOLD },
    {
      what: 'Notification',
      line: 'XNotification: GuestABCD has arrived.',
      was: ChatEventType.NOTIFICATION_ARRIVAL,
    },
  ];

  for (const c of CASES) {
    it(`${c.what}: falls through to UNKNOWN`, () => {
      const e = p(c.line);
      expect(e.type).not.toBe(c.was);
      expect(e.type).toBe(ChatEventType.UNKNOWN);
    });
  }
});

/**
 * And the positives, so the tightening cannot be read as "the prefix parsers
 * got stricter about whitespace". They did not: the trim in each parser is
 * what handles real leading whitespace, and it still does.
 */
describe('real traffic still classifies, whitespace and all', () => {
  it('Finger, bare and with surrounding whitespace', () => {
    for (const line of ['Finger of GuestABCD(U):', '  Finger of GuestABCD(U):  ']) {
      const e = p(line);
      expect(e.type).toBe(ChatEventType.FINGER);
      expect(e.source).toBe('GuestABCD');
    }
  });

  it('Told, bare and with surrounding whitespace', () => {
    for (const line of ['(told GuestABCD)', '\t(told GuestABCD)']) {
      const e = p(line);
      expect(e.type).toBe(ChatEventType.TOLD);
      expect(e.source).toBe('GuestABCD');
    }
  });
});

/**
 * Called directly, not through FicsParser — the ChatEventParser contract says
 * a parser must be correct on its own, which is why the trim lives in each of
 * them rather than one layer up.
 */
describe('the six parsers standalone', () => {
  it('accept leading whitespace and reject a spurious character', () => {
    const finger = new FingerEventParser();
    expect(finger.parse(' Finger of GuestABCD(U):')?.source).toBe('GuestABCD');
    expect(finger.parse('XFinger of GuestABCD(U):')).toBeNull();

    const history = new HistoryEventParser();
    expect(history.parse('\nHistory for GuestABCD:')?.source).toBe('GuestABCD');
    expect(history.parse('XHistory for GuestABCD:')).toBeNull();

    const journal = new JournalEventParser();
    expect(journal.parse(' Journal for GuestABCD:')?.source).toBe('GuestABCD');
    expect(journal.parse('XJournal for GuestABCD:')).toBeNull();

    const variables = new VariablesEventParser();
    expect(variables.parse(' Variable settings of GuestABCD:')?.source).toBe('GuestABCD');
    expect(variables.parse('XVariable settings of GuestABCD:')).toBeNull();

    const told = new ToldEventParser();
    expect(told.parse(' (told GuestABCD)')?.source).toBe('GuestABCD');
    expect(told.parse('X(told GuestABCD)')).toBeNull();

    const notification = new NotificationEventParser();
    expect(notification.parse(' Notification: GuestABCD has arrived.')?.source).toBe('GuestABCD');
    expect(notification.parse('XNotification: GuestABCD has arrived.')).toBeNull();
  });

  /**
   * NotificationEventParser carries a second, separate check on the *untrimmed*
   * line: a >= 600 char line is dropped unless the prefix sits at offset 1.
   * That is Raptor's operator precedence showing through —
   * `text.length() < 600 && startsWith(N) || startsWith(N, 1)` — and it is
   * deliberately left alone. It means a genuinely long notification starting at
   * offset 0 is discarded, which is upstream behaviour, not a local bug.
   */
  it('Notification still drops a >= 600 char line whose prefix is at offset 0', () => {
    const notification = new NotificationEventParser();
    const long = 'Notification: GuestABCD has arrived.' + ' '.padEnd(600, 'x');
    expect(long.length).toBeGreaterThanOrEqual(600);
    expect(notification.parse(long)).toBeNull();
    expect(notification.parse(' ' + long)?.source).toBe('GuestABCD');
  });
});
