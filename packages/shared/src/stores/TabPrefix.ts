/**
 * FICS command prefixes for each tab type. Matches Raptor's
 * `IcsConnector.getChannelTabPrefix` / `getPersonTabPrefix` /
 * `getPartnerTellPrefix` / `getGameChatTabPrefix`.
 *
 * Note the trailing space is intentional — the tab's input widget
 * pre-inserts this string, and the user's typing appends after it.
 */
export const TabPrefix = {
  main: (): string => '',
  channel: (n: string | number): string => `tell ${n} `,
  person: (name: string): string => `tell ${name} `,
  partner: (): string => 'ptell ',
  gameChat: (gameId: string): string => `xwhisper ${gameId} `,
} as const;

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * Build the pattern that recognises a prefix the user typed by hand.
 *
 * `tell 39 ` becomes `/^\s*tell\s+39(?:\s+|$)/i` — the command word and its
 * target, tolerating any spacing between and around them, and matching a bare
 * `tell 39` with nothing after it.
 */
function prefixPattern(prefix: string): RegExp {
  const tokens = prefix
    .trim()
    .split(/\s+/)
    .map(t => t.replace(REGEX_SPECIAL, '\\$&'));
  return new RegExp(`^\\s*${tokens.join('\\s+')}(?:\\s+|$)`, 'i');
}

/**
 * Apply a tab's prefix to a line of user input, without doubling it.
 *
 * Raptor keeps the prefix as pre-inserted text in the input widget, so the
 * user sees `tell 39 ` sitting there and types after it. We apply it at send
 * time instead, which means a user who types the command out of habit — the
 * muscle memory of a plain FICS console — gets `tell 39 tell 39 hello`.
 *
 * So: if the input already opens with this tab's own command and target, that
 * is taken as the prefix rather than as message text.
 *
 * Deliberately narrow, in both directions:
 *
 * - **One occurrence only.** In an `alice` tab, `tell alice tell alice about
 *   the bug` strips one and sends the other, because the second one is what
 *   alice is meant to read.
 * - **This tab's target only.** Typing `tell 40 hi` in the channel-39 tab
 *   still gets the 39 prefix, producing a line FICS will reject. Suppressing
 *   *any* leading command would be the wider rule, but it makes a tab silently
 *   send elsewhere, and the tab's own outbound filter would then drop the echo
 *   so the line vanishes from the transcript. Left as a visible error.
 *
 * The prefix is re-emitted in its canonical form, so `TELL   39   hi` sends as
 * `tell 39 hi`, and the function is idempotent.
 */
export function applyTabPrefix(prefix: string, input: string): string {
  if (!prefix) return input;
  const match = prefixPattern(prefix).exec(input);
  return match ? prefix + input.slice(match[0].length) : prefix + input;
}
