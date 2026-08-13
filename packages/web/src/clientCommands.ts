/**
 * Client-side script commands (Carson, 2026-08-12: "i believe raptor
 * had them") — lines the chat input handles itself instead of sending
 * to FICS. Semantics ported from Raptor's alias classes:
 *
 *   clear censor   ClearCensorAlias: send `=censor`, harvest the reply,
 *   clear noplay   ClearNoplayAlias: `-censor <name>` each entry.
 *   +tab 39        AddTabAlias: opens a channel tab, locally.
 *   +tab name      AddTabAlias: opens a person tab, locally.
 *
 * The clear-list flow is asynchronous: FICS answers `=censor` with
 *   -- censor list: 2 names --
 *   name1 name2
 * and our parser delivers that line by line, so the harvest is a small
 * state machine fed with every incoming console message until it has
 * seen as many names as the header promised.
 */

export interface ClientCommandHost {
  /** Send a real command to FICS. */
  send(command: string): void;
  /** Print an INTERNAL line in this chat window. */
  announce(message: string): void;
  /** Open a channel/person tab in this window. */
  addTab(target: string): void;
  /** Install the clear-list harvester for incoming console messages. */
  startHarvest(feed: (message: string) => boolean): void;
}

const CLEAR_RE = /^clear\s+(censor|noplay)$/i;
const ADD_TAB_RE = /^\+tab\s+(\S+)$/i;
const LIST_HEADER = /--\s+(censor|noplay) list:\s*(\d+) names?\s*--/i;

/**
 * The harvester for one `clear <list>` run. Feed it every incoming
 * console message; it returns true when finished (its caller should
 * then uninstall it).
 */
export function makeListClearer(
  kind: 'censor' | 'noplay',
  host: Pick<ClientCommandHost, 'send' | 'announce'>,
): (message: string) => boolean {
  let expected: number | null = null; // null = header not seen yet
  let removed = 0;
  let fed = 0;
  return message => {
    // Give-up valve: if the header never arrives (or the list never
    // completes), die quietly instead of watching the console forever.
    // The 2026-08-12 live test also proved the flood failure mode: fed
    // its own OUTBOUND echoes, a harvester can self-oscillate — the
    // caller must only feed server text (UNKNOWN events), and this cap
    // bounds the blast radius if that contract is ever broken again.
    if (++fed > 50) {
      if (expected !== null) {
        host.announce(`Gave up clearing your ${kind} list after ${removed} removals.`);
      }
      return true;
    }
    if (expected === null) {
      const header = LIST_HEADER.exec(message);
      if (!header || header[1].toLowerCase() !== kind) return false;
      expected = parseInt(header[2], 10);
      if (expected === 0) {
        host.announce(`Your ${kind} list is already empty.`);
        return true;
      }
      // Names may share the header's message (our parser sometimes
      // hands multi-line chunks) — fall through to harvest the rest.
      message = message.slice(header.index + header[0].length);
    }
    for (const token of message.split(/\s+/)) {
      // FICS handles are 3–17 letters; anything else on these lines
      // (prompts, timestamps, stray punctuation) is not a name.
      if (!/^[a-zA-Z]{3,17}$/.test(token)) continue;
      host.send(`-${kind} ${token}`);
      removed++;
      if (removed >= expected) {
        host.announce(`Removed ${removed} ${removed === 1 ? 'name' : 'names'} from your ${kind} list.`);
        return true;
      }
    }
    return false;
  };
}

/**
 * Try `line` as a client command. Returns true when handled — the
 * caller must NOT also send it to FICS.
 */
export function runClientCommand(line: string, host: ClientCommandHost): boolean {
  const clear = CLEAR_RE.exec(line.trim());
  if (clear) {
    const kind = clear[1].toLowerCase() as 'censor' | 'noplay';
    host.startHarvest(makeListClearer(kind, host));
    host.send(`=${kind}`);
    return true;
  }
  const tab = ADD_TAB_RE.exec(line.trim());
  if (tab) {
    host.addTab(tab[1]);
    host.announce(
      /^\d+$/.test(tab[1])
        ? `Added channel tab ${tab[1]}.`
        : `Added person tab ${tab[1]}.`,
    );
    return true;
  }
  return false;
}
