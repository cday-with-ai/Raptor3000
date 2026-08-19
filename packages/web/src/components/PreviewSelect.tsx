import { useId, useState, type ReactNode } from 'react';

/**
 * One control for every choice you pick by eye: board frame, clock face,
 * piece set.
 *
 * The problem it solves is that those three had drifted into two opposite
 * shapes. Frames and clocks were open grids — seven and ten cards, always
 * expanded, so the Board and Clock sections were mostly swatches and you
 * scrolled past the settings underneath. Piece set was the other extreme, a
 * plain `<select>` of five names with nothing to look at, which is the
 * failure ClockDesignPicker's own comment warned about: "picking from a name
 * list is how we got ten faces nobody could tell apart."
 *
 * So: collapsed, it is a one-line row showing **what is selected**, rendered,
 * not just named. Open, it is the same grid of real previews those pickers
 * already had. Carson, 2026-08-18: "we need a way to show the selected one
 * and other possibilities like maybe in a select or something."
 *
 * Deliberately not a `<select>`: an option element can hold text and nothing
 * else, so a native dropdown can never show a board or a clock chip. This is
 * a disclosure instead — the same affordance, minus the lie that the choices
 * are words.
 *
 * No new copy. The trigger says the selected option's own name and the
 * chevron carries the state, so this ships without a string in fifteen
 * locale files. `aria-expanded` tells a screen reader what the chevron tells
 * everyone else.
 */
export function PreviewSelect<T extends string>({
  value,
  options,
  label,
  preview,
  blurb,
  columnWidth = 180,
  groupLabel,
  onChange,
}: {
  value: T;
  options: readonly T[];
  label: (id: T) => string;
  /** `compact` is the collapsed trigger — small, no blurb, no card. */
  preview: (id: T, compact: boolean) => ReactNode;
  blurb?: (id: T) => string;
  /** Minimum grid column when open. Clocks need more room than frames. */
  columnWidth?: number;
  /** Accessible name for the expanded list. Falls back to the trigger. */
  groupLabel: string;
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '6px 10px',
          background: 'var(--bg-input)',
          color: 'var(--fg)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          cursor: 'pointer',
          textAlign: 'start',
          font: 'inherit',
        }}
      >
        {/* No fixed width here. A clock chip is wider than a piece row and
            far wider than a mini board; boxing them all at one size pushed
            the chip out of the button and under the label. Each compact
            preview sizes itself and this slot just refuses to shrink. */}
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {preview(value, true)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 650 }}>{label(value)}</span>
        <span
          style={{
            marginInlineStart: 'auto',
            fontSize: 12,
            color: 'var(--fg-muted)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="group"
          aria-label={groupLabel}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}px, 1fr))`,
            gap: 8,
          }}
        >
          {options.map(id => {
            const on = value === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 8,
                  padding: '10px 10px 8px',
                  background: 'var(--bg-sunken)',
                  color: 'var(--fg)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`,
                  boxShadow: on ? '0 0 0 1px var(--accent)' : 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'start',
                  font: 'inherit',
                }}
              >
                {preview(id, false)}
                <span style={{ fontSize: 13, fontWeight: 650 }}>{label(id)}</span>
                {blurb && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-muted)',
                      lineHeight: 1.35,
                      minHeight: '2.7em',
                    }}
                  >
                    {blurb(id)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
