import { describe, expect, it } from 'vitest';
import * as shell from '../shellStyles.js';

/**
 * The Help pane could not be scrolled: content past the viewport was
 * clipped and unreachable. The cause is a pair, not a single property —
 * `overflow: 'auto'` alone does nothing while the pane is a flex child
 * with the default `min-height: auto`, because it never gets constrained
 * below its own content height and so never overflows anything. Adding
 * only `overflow` is the standard way this fix appears not to work, and
 * removing `minHeight: 0` later is the standard way it regresses: it reads
 * as a redundant zero.
 *
 * So these tests assert the pair as a pair, and do it by walking the
 * module's exports rather than a hand-written list — a pane added to
 * `shellStyles.ts` next month is covered without anyone remembering to
 * come back here. What this cannot see is a pane declared inline in a
 * component; the point of putting the growing panes in one module is that
 * there is somewhere for that check to stand.
 *
 * No DOM is involved. These are plain objects, and the assertions are
 * about what the shell hands React, not about layout the browser
 * computes — a real scroll can only be confirmed in a browser.
 */

type Style = Record<string, unknown>;

/** Every exported style object that grows to fill the shell column. */
const growingPanes = Object.entries(shell).filter(
  ([, style]) => (style as Style).flex === 1,
) as Array<[string, Style]>;

describe('post-login shell layout', () => {
  it('exports at least the panes the shell actually renders', () => {
    const names = growingPanes.map(([name]) => name);
    // scrollPane is the base; the other three are the `/` tabs.
    expect(names).toEqual(
      expect.arrayContaining([
        'scrollPane',
        'helpContainer',
        'optionsGrid',
        'seekPane',
      ]),
    );
  });

  describe.each(growingPanes)('%s', (_name, style) => {
    it('scrolls its own overflow', () => {
      expect(style.overflow).toBe('auto');
    });

    it('can shrink below its content height', () => {
      // `minHeight: 0` — without it a flex child's min-height:auto pins it
      // to its content and the overflow above is never reached.
      expect(style.minHeight).toBe(0);
    });
  });

  it('bounds the column so the panes are constrained at all', () => {
    // minHeight:'100vh' grows with content; height:'100vh' does not, and
    // only a bounded column can over-constrain the pane inside it.
    expect(shell.pageShell.height).toBe('100vh');
    expect((shell.pageShell as Style).minHeight).toBeUndefined();
    expect(shell.pageShell.display).toBe('flex');
    expect(shell.pageShell.flexDirection).toBe('column');
  });

  it('pins the header and footer so the squeeze lands on the pane', () => {
    expect(shell.pageHeader.flexShrink).toBe(0);
    expect(shell.footer.flexShrink).toBe(0);
  });

  it('gives the panes the base rather than re-deriving it', () => {
    for (const [, style] of growingPanes) {
      expect(style.width).toBe('100%');
      expect(style.boxSizing).toBe('border-box');
    }
  });
});
