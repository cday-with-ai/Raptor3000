/**
 * Minimal TypeScript port of Raptor's `RaptorStringTokenizer`
 * (raptor/util/RaptorStringTokenizer.java). Every call site in the Raptor
 * game parsers passes `isEatingBlocksOfDelimiters = true`, so that's the
 * only mode we replicate.
 *
 * Unlike `String.prototype.split`, this iterates left-to-right across a
 * character-set of delimiters, collapses consecutive delimiter runs into
 * one boundary, and trims any leading delimiters off the source before
 * yielding the first token. Several Raptor parsers rely on those exact
 * semantics (e.g. Style12 uses delim set ` <>\n` so that `<12>` is eaten
 * and the first real token is "12").
 */
export class RaptorTokenizer {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly delimiters: string,
  ) {
    this.trimLeadingDelimiters();
  }

  hasMoreTokens(): boolean {
    this.trimLeadingDelimiters();
    return this.index < this.source.length;
  }

  /**
   * Returns the next token, or `null` if the source is exhausted. Throws
   * if you call it past the end — mimics Raptor's habit of chaining
   * `Integer.parseInt(tok.nextToken())` without a hasMoreTokens check.
   */
  nextToken(): string {
    this.trimLeadingDelimiters();
    if (this.index >= this.source.length) {
      throw new Error('RaptorTokenizer: no more tokens');
    }
    const start = this.index;
    while (
      this.index < this.source.length &&
      !this.isDelim(this.source.charAt(this.index))
    ) {
      this.index++;
    }
    const token = this.source.substring(start, this.index);
    this.trimLeadingDelimiters();
    return token;
  }

  private isDelim(ch: string): boolean {
    return this.delimiters.indexOf(ch) !== -1;
  }

  private trimLeadingDelimiters(): void {
    while (
      this.index < this.source.length &&
      this.isDelim(this.source.charAt(this.index))
    ) {
      this.index++;
    }
  }
}

/**
 * Raptor's IcsUtils.timeToLong. Format is `(mmm:ss.MMM)` → milliseconds.
 * Also used by Style12's `timeTakenStringToInt` with the same delimiters.
 */
export function timeToLong(timeString: string): number {
  const tok = new RaptorTokenizer(timeString, '(:.)');
  const minutes = parseInt(tok.nextToken(), 10);
  const seconds = parseInt(tok.nextToken(), 10);
  const millis = parseInt(tok.nextToken(), 10);
  return (minutes * 60 + seconds) * 1000 + millis;
}
