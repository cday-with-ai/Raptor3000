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
 * The list-reply state machine both harvesters share. Feed it every
 * incoming SERVER message (UNKNOWN events only — the 2026-08-12 flood
 * proved what happens when a harvester eats its own OUTBOUND echoes);
 * `onName` fires per harvested name, `onDone(count | null)` fires once
 * — null means it gave up without ever seeing the header. Returns true
 * when finished so the caller can uninstall it.
 */
function makeListHarvester(
  kind: 'censor' | 'noplay',
  onName: (name: string) => void,
  onDone: (count: number | null) => void,
): (message: string) => boolean {
  let expected: number | null = null; // null = header not seen yet
  let seen = 0;
  let fed = 0;
  return message => {
    // Give-up valve: bounds the blast radius even if the feed contract
    // is ever broken again.
    if (++fed > 50) {
      onDone(expected === null ? null : seen);
      return true;
    }
    if (expected === null) {
      const header = LIST_HEADER.exec(message);
      if (!header || header[1].toLowerCase() !== kind) return false;
      expected = parseInt(header[2], 10);
      if (expected === 0) {
        onDone(0);
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
      onName(token);
      seen++;
      if (seen >= expected) {
        onDone(seen);
        return true;
      }
    }
    return false;
  };
}

/** The `clear censor` / `clear noplay` harvester: removes each name. */
export function makeListClearer(
  kind: 'censor' | 'noplay',
  host: Pick<ClientCommandHost, 'send' | 'announce'>,
): (message: string) => boolean {
  return makeListHarvester(
    kind,
    name => host.send(`-${kind} ${name}`),
    count => {
      if (count === null) return; // never saw the header; die quietly
      host.announce(
        count === 0
          ? `Your ${kind} list is already empty.`
          : `Removed ${count} ${count === 1 ? 'name' : 'names'} from your ${kind} list.`,
      );
    },
  );
}

/**
 * The silent collector (censor-aware backfill, Carson 2026-08-13):
 * reads the list into a Set and hands it over, announcing nothing.
 */
export function makeListCollector(
  kind: 'censor' | 'noplay',
  onCollected: (names: ReadonlySet<string>) => void,
): (message: string) => boolean {
  const names = new Set<string>();
  return makeListHarvester(
    kind,
    name => names.add(name.toLowerCase()),
    () => onCollected(names),
  );
}

/**
 * Live censor-list sync: watch what the user (or FICS) says about the
 * list and update a local Set. `+censor bob` / `-censor bob` outbound,
 * and FICS's own confirmations, both count.
 */
const CENSOR_EDIT_OUT = /^([+-])censor\s+([a-zA-Z]{3,17})$/i;
const CENSOR_EDIT_CONFIRM = /\[([a-zA-Z]{3,17})\] (added to|removed from) your censor list/i;

export function censorEditIn(
  message: string,
  isOutbound: boolean,
): { name: string; add: boolean } | null {
  if (isOutbound) {
    const m = CENSOR_EDIT_OUT.exec(message.trim());
    return m ? { name: m[2].toLowerCase(), add: m[1] === '+' } : null;
  }
  const m = CENSOR_EDIT_CONFIRM.exec(message);
  return m ? { name: m[1].toLowerCase(), add: m[2] === 'added to' } : null;
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
