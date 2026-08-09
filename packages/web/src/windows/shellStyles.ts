/**
 * Layout skeleton for the post-login shell (`/`) — the header/pane/footer
 * column and the panes that sit in it. Cosmetic styles stay next to the
 * components that use them; what lives here is the part that decides
 * whether content past the viewport is reachable at all.
 *
 * The document deliberately does not scroll: `index.css` sets
 * `html, body, #root { height: 100%; overflow: hidden }`, which is right
 * for an app shell but means every pane that can outgrow the viewport has
 * to declare its own scrolling. That takes two properties together, and
 * only one of them is obvious:
 *
 *   overflow: 'auto'  — the pane scrolls instead of clipping.
 *   minHeight: 0      — a flex child's default `min-height: auto` refuses
 *                       to shrink below its content, so without this the
 *                       pane just grows past the bottom of the column and
 *                       `overflow` never has anything to do.
 *
 * Setting only the first is the usual reason this fix looks like it didn't
 * work. `scrollPane` carries both and every growing pane is built from it;
 * `__tests__/shellLayout.test.ts` walks this module's exports and fails on
 * any pane that grows without the pair, including one added later.
 *
 * The column also has to be *bounded* before any of that matters, which is
 * why `pageShell` is `height: '100vh'` and not `minHeight` — a min-height
 * column grows with its content, so the pane is never over-constrained and
 * never scrolls. The header and footer are `flexShrink: 0` so the squeeze
 * lands on the pane rather than on them.
 */

/** The `/` shell: a bounded column, header and footer pinned, pane in between. */
export const pageShell = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden' as const,
  background: 'var(--bg)',
  color: 'var(--fg)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
} as const;

export const pageHeader = {
  flexShrink: 0,
  padding: '20px 32px 16px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-raised)',
} as const;

export const footer = {
  flexShrink: 0,
  padding: '10px 32px',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  fontSize: 11,
  opacity: 0.5,
} as const;

/**
 * Base for every pane that fills the space between header and footer.
 * Spread it rather than repeating `flex`/`minHeight`/`overflow` — the
 * three only work as a set.
 */
export const scrollPane = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto' as const,
  width: '100%',
  boxSizing: 'border-box' as const,
} as const;

export const helpContainer = {
  ...scrollPane,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 16,
  padding: 24,
  maxWidth: 900,
  margin: '0 auto',
} as const;

export const optionsGrid = {
  ...scrollPane,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
  padding: 24,
  maxWidth: 1200,
  margin: '0 auto',
} as const;

export const seekPane = {
  ...scrollPane,
  display: 'flex',
  flexDirection: 'column' as const,
  padding: 24,
  maxWidth: 1200,
  margin: '0 auto',
} as const;
