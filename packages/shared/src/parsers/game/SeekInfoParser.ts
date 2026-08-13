import {
  SeekColor,
  SeekType,
  type Seek,
  type SeekColorCode,
  type SeekTypeCode,
} from '../../models/Seek.js';

/**
 * The `iset seekinfo 1` stream (2026-08-13, for the seek graph):
 *
 *   <s> 45 w=GuestNNNN ti=00 rt=1234P t=10 i=0 r=u tp=blitz c=? rr=0-9999 a=t f=f
 *   <sr> 12 34 56
 *   <sc>
 *
 * `<s>` announces (or re-announces) an ad, `<sr>` removes ads by
 * number, `<sc>` clears the board (sent when seekinfo re-syncs).
 * Field reference: FICS `help iv_seekinfo`. Unknown keys are ignored
 * so protocol drift degrades to defaults instead of dropping the seek.
 */
export class SeekInfoParser {
  /** Parse an `<s>` line into a Seek, or null if it isn't one. */
  parseAdd(line: string): Seek | null {
    if (!line.startsWith('<s> ')) return null;
    const tokens = line.slice(4).trim().split(/\s+/);
    const ad = tokens[0];
    if (!/^\d+$/.test(ad ?? '')) return null;

    const kv = new Map<string, string>();
    for (const t of tokens.slice(1)) {
      const eq = t.indexOf('=');
      if (eq > 0) kv.set(t.slice(0, eq), t.slice(eq + 1));
    }

    const rtRaw = kv.get('rt') ?? '0';
    const rtNum = rtRaw.replace(/[PE]$/, '');
    const range = /^(\d+)-(\d+)$/.exec(kv.get('rr') ?? '');

    return {
      ad,
      name: kv.get('w') ?? '?',
      rating: rtNum === '0' ? '----' : rtNum,
      minutes: parseInt(kv.get('t') ?? '0', 10) || 0,
      increment: parseInt(kv.get('i') ?? '0', 10) || 0,
      rated: kv.get('r') === 'r',
      typeDescription: kv.get('tp') ?? '?',
      type: seekTypeFrom(kv.get('tp') ?? ''),
      color: seekColorFrom(kv.get('c') ?? '?'),
      minRating: range ? parseInt(range[1], 10) : 0,
      maxRating: range ? parseInt(range[2], 10) : 9999,
      // a=f means the seeker must confirm — a manual seek.
      manual: kv.get('a') === 'f',
      formula: kv.get('f') === 't',
    };
  }

  /** Parse an `<sr>` line into the removed ad numbers, or null. */
  parseRemove(line: string): readonly string[] | null {
    if (!line.startsWith('<sr>')) return null;
    return line.slice(4).trim().split(/\s+/).filter(t => /^\d+$/.test(t));
  }

  /** `<sc>` — every outstanding seek is gone. */
  isClear(line: string): boolean {
    return line.startsWith('<sc>');
  }
}

function seekTypeFrom(tp: string): SeekTypeCode {
  const t = tp.toLowerCase();
  if (t === 'blitz') return SeekType.BLITZ;
  if (t === 'lightning') return SeekType.LIGHTNING;
  if (t === 'standard') return SeekType.STANDARD;
  if (t === 'untimed') return SeekType.UNTIMED;
  if (t === 'crazyhouse' || t === 'zh') return SeekType.CRAZYHOUSE;
  if (t === 'bughouse') return SeekType.BUGHOUSE;
  if (t === 'suicide') return SeekType.SUICIDE;
  if (t === 'losers') return SeekType.LOSERS;
  if (t === 'atomic') return SeekType.ATOMIC;
  if (t === 'wild/fr') return SeekType.FISCHER_RANDOM;
  if (t.startsWith('wild')) return SeekType.WILD;
  return SeekType.OTHER;
}

function seekColorFrom(c: string): SeekColorCode {
  if (c === 'W') return SeekColor.WHITE;
  if (c === 'B') return SeekColor.BLACK;
  return SeekColor.AUTO;
}
