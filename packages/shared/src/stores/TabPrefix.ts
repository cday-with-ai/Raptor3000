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
