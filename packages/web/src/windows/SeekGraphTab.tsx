import { observer } from 'mobx-react-lite';
import type { RaptorContext } from './appContext.js';

/**
 * Inline seek graph — lives as a tab on `/`, not a popup. Will
 * eventually render a scatter plot keyed on time × rating, with live
 * insert/remove driven by <s>/<sr> seekinfo events from FICS. For now
 * it's a placeholder that at least proves the tab wiring works.
 */
export const SeekGraphTab = observer(function SeekGraphTab({
  context: _context,
}: {
  context: RaptorContext;
}) {
  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>Seek Graph</h2>
      <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
        time (log) × rating — click a seek to accept
      </div>
      <div
        style={{
          flex: 1,
          marginTop: 16,
          minHeight: 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1b1f26',
          border: '1px solid #2a313c',
          borderRadius: 6,
          opacity: 0.6,
          fontSize: 13,
        }}
      >
        (scatter plot placeholder — wired after seekinfo stream lands)
      </div>
    </main>
  );
});
