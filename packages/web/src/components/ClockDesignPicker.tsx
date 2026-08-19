import type { AppPreferences } from '../preferences.js';
import {
  CLOCK_DESIGNS,
  CLOCK_SETS,
  CLOCK_SET_LABELS,
  type ClockSet,
} from '../clockDesigns.js';
import type { ResolvedTheme } from '../theme.js';
import { ClockChip } from './ClockChip.js';
import { PreviewSelect } from './PreviewSelect.js';

/**
 * Options picker for clock faces. Each card is the real chip in idle,
 * active, and low — picking from a name list is how we got ten faces
 * nobody could tell apart.
 *
 * Collapsed it shows the running face on its own, which is the state you
 * actually spend the game looking at; open it is all ten in three states.
 */
export function ClockDesignPicker({
  prefs,
  theme,
  onChange,
}: {
  prefs: AppPreferences;
  theme: ResolvedTheme;
  onChange: (id: ClockSet) => void;
}) {
  return (
    <PreviewSelect<ClockSet>
      value={prefs.clockSet}
      options={CLOCK_SETS}
      label={id => CLOCK_SET_LABELS[id]}
      blurb={id => CLOCK_DESIGNS[id].blurb}
      groupLabel={CLOCK_SET_LABELS[prefs.clockSet]}
      columnWidth={200}
      onChange={onChange}
      preview={(id, compact) => {
        const sample: AppPreferences = { ...prefs, clockSet: id };
        // Collapsed, one ticking chip — the trigger is a row, not a card,
        // and three chips in it would wrap and undo the point of collapsing.
        if (compact) {
          return <ClockChip ms={185_000} ticking prefs={sample} theme={theme} />;
        }
        return (
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <ClockChip ms={185_000} ticking prefs={sample} theme={theme} />
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <ClockChip ms={608_000} ticking={false} prefs={sample} theme={theme} />
              <ClockChip ms={7_300} ticking prefs={sample} theme={theme} />
            </span>
          </span>
        );
      }}
    />
  );
}
