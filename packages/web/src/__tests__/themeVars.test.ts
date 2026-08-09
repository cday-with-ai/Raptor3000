import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

/**
 * The theme is only as good as the number of surfaces that read it.
 *
 * `installThemeSync` (2026-08-09) got a theme change to every open window,
 * and that part works — but a window only repaints the properties that were
 * written as `var(--…)` in the first place. Roughly thirty style declarations
 * were still hex literals copied straight out of the *dark* half of the
 * palette, so flipping to Day left dark borders and dark panels on a white
 * page. Fixing them once is easy; the failure mode is that the next inline
 * style is written the same way and nobody notices until they open Day mode.
 *
 * So this is a lint that happens to be a test. It reads `index.css` as the
 * single source of truth for what the palette *is*, and fails on any source
 * file that hardcodes one of those values.
 *
 * It deliberately does NOT object to colours that aren't in the palette —
 * the board squares, the clock's running/low-time greens and reds, the chat
 * type colours, the login error red. Those are semantic colours that happen
 * to be fixed, and inventing theme vars for them is a design decision rather
 * than a mechanical one. What it catches is the specific mistake of writing
 * `#2a2f38` when `var(--border-soft)` is the same colour with a light-mode
 * counterpart.
 */

const SRC = fileURLToPath(new URL('..', import.meta.url));
const CSS = join(SRC, 'index.css');

/**
 * Literals allowed to keep a palette value, and why. Every entry must still
 * be found in its file — a stale exemption is itself a failure, so this list
 * cannot quietly outlive the line it was written for.
 */
const EXEMPT: ReadonlyArray<{ file: string; hex: string; why: string }> = [
  {
    file: 'windows/BoardWindow.tsx',
    hex: '#15181d',
    why: 'overlay text drawn on top of the board, whose squares keep their own palette in both themes',
  },
];

function paletteBlock(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  expect(start, `${selector} missing from index.css`).toBeGreaterThanOrEqual(0);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out = new Map<string, string>();
  for (const line of body.split('\n')) {
    const m = /^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(line);
    if (m) out.set(m[1], m[2].toLowerCase());
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const css = readFileSync(CSS, 'utf8');
const dark = paletteBlock(css, 'html[data-theme="dark"]');
const light = paletteBlock(css, 'html[data-theme="light"]');

describe('theme palette', () => {
  it('declares the vars the app is built on', () => {
    for (const name of ['--bg', '--bg-raised', '--fg', '--border', '--border-soft', '--border-strong', '--accent']) {
      expect(dark.has(name), `${name} missing from the dark block`).toBe(true);
    }
  });

  it('declares every var in both blocks', () => {
    // A var present only in the dark block still *resolves* in light mode,
    // because `:root` matches too — it just silently keeps its dark value.
    // There is no browser warning for this; the only symptom is one stubborn
    // dark element on a white page.
    expect([...dark.keys()].filter(n => !light.has(n))).toEqual([]);
    expect([...light.keys()].filter(n => !dark.has(n))).toEqual([]);
  });

  it('gives every var a different value in light mode', () => {
    // Not a style rule — a var that is identical in both themes is a var that
    // does nothing, and is either a mistake or should be a plain constant.
    const same = [...dark.entries()].filter(([n, v]) => light.get(n) === v);
    expect(same).toEqual([]);
  });

  it('has three distinguishable border weights in each theme', () => {
    for (const [label, block] of [['dark', dark], ['light', light]] as const) {
      const weights = ['--border', '--border-soft', '--border-strong'].map(n => block.get(n));
      expect(new Set(weights).size, `${label} border weights collide`).toBe(3);
    }
  });
});

describe('source files use the palette rather than copying it', () => {
  const files = sourceFiles(SRC);
  // Guard the guard: if the walk ever stops finding files, every check below
  // passes vacuously.
  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  const byValue = new Map<string, string[]>();
  for (const [name, value] of dark) {
    byValue.set(value, [...(byValue.get(value) ?? []), name]);
  }

  for (const file of files) {
    const rel = relative(SRC, file).split('\\').join('/');
    it(`${rel} hardcodes no palette colour`, () => {
      const text = readFileSync(file, 'utf8');
      const offences: string[] = [];
      for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const hex = m[0].toLowerCase();
        const vars = byValue.get(hex);
        if (!vars) continue;
        if (EXEMPT.some(e => e.file === rel && e.hex === hex)) continue;
        const line = text.slice(0, m.index).split('\n').length;
        offences.push(`${rel}:${line} ${hex} — use ${vars.map(v => `var(${v})`).join(' or ')}`);
      }
      expect(offences).toEqual([]);
    });
  }

  it('carries no stale exemptions', () => {
    for (const e of EXEMPT) {
      const text = readFileSync(join(SRC, e.file), 'utf8');
      expect(text.toLowerCase().includes(e.hex), `${e.file} no longer contains ${e.hex}`).toBe(true);
    }
  });
});
