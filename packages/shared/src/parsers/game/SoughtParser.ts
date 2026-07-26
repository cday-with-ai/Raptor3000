import type { ChunkParser } from '../FicsParser.js';
import {
  SeekColor,
  SeekType,
  type Seek,
  type SeekColorCode,
  type SeekTypeCode,
} from '../../models/Seek.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * `sought` seek-list output. Direct port of Raptor's `SoughtParser.java`
 * (BSD; Raptor itself adapted this from kozyr's Decaf code).
 *
 * Example block (ends with `N ads displayed.` / `1 ad displayed.`):
 *
 *   123 1200 guestABC    5   0 unrated blitz                  0-9999
 *   124 1850 GMBob       3   0 rated   blitz       [white]    0-9999 mf
 *   3 ads displayed.
 *
 * The first line's ad field is validated as an integer — bugwho blocks
 * also end with "ads displayed." so integer-prefix is the discriminator.
 */
export class SoughtParser implements ChunkParser<Seek[]> {
  readonly name = 'SoughtParser';
  static readonly AD_DISPLAYED = 'ad displayed.';
  static readonly ADS_DISPLAYED = 'ads displayed.';

  parse(message: string): Seek[] | null {
    if (
      !message.endsWith(SoughtParser.ADS_DISPLAYED) &&
      !message.endsWith(SoughtParser.AD_DISPLAYED)
    ) {
      return null;
    }

    // Raptor splits on `\n\s*`: one newline plus any trailing whitespace.
    const lines = message.split(/\n\s*/);
    const seeks: Seek[] = [];

    // Skip the summary line at the end (the "N ads displayed." line).
    for (let i = 0; i < lines.length - 1; i++) {
      const rawLine = lines[i];
      // Raptor replaces "----" with "****" so `-` in delim set doesn't
      // split an unrated marker apart.
      const normalized = rawLine.replace(/----/g, '****');
      const tok = new RaptorTokenizer(normalized, ' -[]');

      let ad: string;
      try {
        ad = tok.nextToken();
      } catch {
        return null;
      }

      if (i === 0 && !/^\d+$/.test(ad)) {
        // First line must start with an integer ad number — otherwise
        // this isn't a sought block.
        return null;
      }

      let rating = tok.nextToken();
      if (rating === '****') rating = '----';
      const name = tok.nextToken();
      const minutes = parseInt(tok.nextToken(), 10);
      const increment = parseInt(tok.nextToken(), 10);
      const rated = tok.nextToken() === 'rated';
      const typeDescription = tok.nextToken();

      const last1 = tok.hasMoreTokens() ? tok.nextToken() : '';
      const last2 = tok.hasMoreTokens() ? tok.nextToken() : '';
      const last3 = tok.hasMoreTokens() ? tok.nextToken() : null;
      const last4 = tok.hasMoreTokens() ? tok.nextToken() : null;

      let color: SeekColorCode = SeekColor.AUTO;
      let minRating: number;
      let maxRating: number;
      let manual = false;
      let formula = false;

      if (last1 === 'black' || last1 === 'white') {
        color = last1 === 'white' ? SeekColor.WHITE : SeekColor.BLACK;
        minRating = parseInt(last2, 10);
        maxRating = parseInt(last3 ?? '0', 10);
        if (last4 != null) {
          manual = last4.includes('m');
          formula = last4.includes('f');
        }
      } else {
        minRating = parseInt(last1, 10);
        maxRating = parseInt(last2, 10);
        if (last3 != null) {
          manual = last3.includes('m');
          formula = last3.includes('f');
        }
      }

      seeks.push({
        ad,
        name,
        rating,
        minutes,
        increment,
        rated,
        typeDescription,
        type: classifyType(typeDescription),
        color,
        minRating,
        maxRating,
        manual,
        formula,
      });
    }
    return seeks;
  }
}

function classifyType(desc: string): SeekTypeCode {
  if (desc.includes('blitz')) return SeekType.BLITZ;
  if (desc.includes('lightning')) return SeekType.LIGHTNING;
  if (desc.includes('standard')) return SeekType.STANDARD;
  if (desc.includes('suicide')) return SeekType.SUICIDE;
  if (desc.includes('losers')) return SeekType.LOSERS;
  if (desc.includes('atomic')) return SeekType.ATOMIC;
  if (desc.includes('fr')) return SeekType.FISCHER_RANDOM;
  if (desc.includes('crazyhouse')) return SeekType.CRAZYHOUSE;
  if (desc.includes('wild')) return SeekType.WILD;
  if (desc.includes('untimed')) return SeekType.UNTIMED;
  return SeekType.OTHER;
}
