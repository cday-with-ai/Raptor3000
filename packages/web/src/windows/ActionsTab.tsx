import { useState } from 'react';
import { seekPane } from './shellStyles.js';

/**
 * The actions pane (Carson, 2026-08-15): "actions will have things like
 * follow best blitz, follow best lightning, follow best standard … and
 * possible ways to interact with bots like puzzlebot, endgame bot,
 * statbot, etc. you can tell the bots help for information."
 *
 * A chat-window view like the seek graph — it takes the log's place, and
 * the input row below stays live, which is the whole reason it can be
 * lightweight: nothing here has to be a complete interface to anything.
 *
 * The design rule, and the reason there is no wizard: **every button is
 * a real FICS command, printed next to itself.** The console under this
 * pane already echoes what you send, so a click is a lesson — you use
 * `observe /b` once from a button and you know it forever. Hiding the
 * command would make this pane the only way to do these things; showing
 * it makes the pane a shortcut you can outgrow. That is also why the
 * bot cards lead with `help`: the bots document themselves, so pointing
 * at their own door beats a list of their commands transcribed here,
 * which would rot the first time a bot changed.
 *
 * Three verbs, and the differences are all about where the answer lands:
 *   - **send** fires and stays here. Only the observe buttons use it,
 *     because their answer is a board window — the same bargain the seek
 *     graph strikes when you click a dot, and its next-door neighbour in
 *     the switcher should not behave differently.
 *   - **ask** fires and hands the console back, because the answer *is*
 *     console text. A pane that keeps the floor while the reply you
 *     asked for scrolls past behind it is just a way to miss it. The
 *     follow buttons are ask rather than send even though they can open
 *     a board: their reliable answer is the line naming who you are now
 *     following, and the board only appears if that player happens to be
 *     playing this minute.
 *   - **talk to** never sends. It types `tell <bot> ` into the input line
 *     and leaves the cursor there — the cockpit's handoff rule, where a
 *     tool may write a command but only a human may press Enter. You see
 *     the syntax, you finish the sentence.
 */
export function ActionsTab({
  onSend,
  onAsk,
  onType,
  onOpenTab,
}: {
  /** Run a FICS command now and stay on this pane. */
  onSend: (command: string) => void;
  /** Run a FICS command and return to the console to read the reply. */
  onAsk: (command: string) => void;
  /** Type into the live input line, focus it, show the console. Never sends. */
  onType: (text: string) => void;
  /** Open a person tab so a bot's replies get their own pane. */
  onOpenTab: (handle: string) => void;
}) {
  const [handle, setHandle] = useState('');
  const custom = handle.trim();

  return (
    <main style={seekPane}>
      <h2 style={heading}>
        Actions{' '}
        <span style={subtitle}>
          every button is a real FICS command — it is printed beside itself,
          and the console below shows it going out
        </span>
      </h2>

      <section style={section}>
        <h3 style={sectionTitle}>Watch the best game</h3>
        <p style={note}>
          FICS picks the highest-rated game in progress of that type.{' '}
          <b>Observe</b> is one shot — that game, and when it ends you are
          done. <b>Follow</b> is a subscription to the player: FICS opens
          their next game by itself, and keeps doing it until you stop.
        </p>
        <div style={row}>
          {BEST_GAMES.map(g => (
            <CommandButton
              key={`observe${g.flag}`}
              label={`observe ${g.label}`}
              command={`observe ${g.flag}`}
              run={onSend}
              big
            />
          ))}
        </div>
        <div style={{ ...row, marginTop: 8, alignItems: 'center' }}>
          {BEST_GAMES.map(g => (
            <CommandButton
              key={`follow${g.flag}`}
              label={`follow ${g.label}`}
              command={`follow ${g.flag}`}
              // ASK, not send, and the difference is the point of the
              // button: follow's answer is a sentence naming the player
              // you are now subscribed to. A board only opens if they
              // happen to be mid-game right now, so staying on the pane
              // would hide the only reliable reply behind it.
              run={onAsk}
              big
            />
          ))}
          {/* Bare `follow` is FICS's own off switch — "Without
              parameters, follow will end your current follow situation"
              — so the stop is the same word, which is worth showing
              rather than hiding behind a Stop label with no command
              under it. */}
          <CommandButton label="stop following" command="follow" run={onAsk} />
        </div>
      </section>

      <section style={section}>
        <h3 style={sectionTitle}>Bots</h3>
        <p style={note}>
          Every bot on FICS documents itself, so <code style={code}>help</code>{' '}
          is the door to all of them — that is the one command worth knowing
          here. <code style={code}>finger</code> shows who the bot is;{' '}
          <b>talk to</b> types <code style={code}>tell &lt;bot&gt;</code> into
          the input line and stops, leaving the sending to you.
        </p>
        <div style={cardGrid}>
          {BOTS.map(bot => (
            <BotCard
              key={bot.handle}
              handle={bot.handle}
              blurb={bot.blurb}
              onAsk={onAsk}
              onTalk={() => {
                onOpenTab(bot.handle);
                onType(`tell ${bot.handle} `);
              }}
            />
          ))}
        </div>
        <div style={{ ...row, marginTop: 14, alignItems: 'center' }}>
          <span style={{ ...note, margin: 0 }}>any other bot or player:</span>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && custom) {
                e.preventDefault();
                onAsk(`tell ${custom} help`);
              }
            }}
            placeholder="handle"
            aria-label="Bot or player handle"
            style={handleBox}
          />
          <CommandButton
            label="help"
            command={custom ? `tell ${custom} help` : 'tell <handle> help'}
            run={onAsk}
            disabled={!custom}
          />
          <CommandButton
            label="finger"
            command={custom ? `finger ${custom}` : 'finger <handle>'}
            run={onAsk}
            disabled={!custom}
          />
          <button
            style={{ ...btn, opacity: custom ? 1 : 0.4 }}
            disabled={!custom}
            title={`type "tell ${custom || '<handle>'} " into the input line — it does not send`}
            onClick={() => {
              onOpenTab(custom);
              onType(`tell ${custom} `);
            }}
          >
            talk to
          </button>
        </div>
      </section>
    </main>
  );
}

/**
 * The three Carson named. `/b` is the site's own worked example (README:
 * "sign in as a guest and `observe /b`").
 *
 * The selector is the whole point: `observe` and `follow` take the SAME
 * flags on FICS —
 *
 *   follow [[user] | [/l|/b|/s|/S|/w|/z|/B|/L|/x]]
 *
 * — so "follow the best blitz player" is one command and not a two-step
 * where you observe, read a handle off the board, and type it back in.
 * The pane's note used to send people down exactly that path, because
 * `follow <handle>` is the form everyone remembers. Checked against
 * FICS's own help file rather than memory, which is the rule for
 * anything this pane prints as a command.
 *
 * Hence one flag per row, used to build both verbs, rather than two
 * hand-written command strings that could drift apart.
 */
const BEST_GAMES: readonly { label: string; flag: string }[] = [
  { label: 'blitz', flag: '/b' },
  { label: 'lightning', flag: '/l' },
  { label: 'standard', flag: '/s' },
];

/**
 * The bots Carson named. Deliberately short and deliberately not a
 * catalogue of their commands: the blurb says only what the handle
 * already says, and `help` fills in the rest from the bot itself. The
 * free-text row above is what "etc." means — any handle, same buttons.
 */
const BOTS: readonly { handle: string; blurb: string }[] = [
  { handle: 'puzzlebot', blurb: 'tactics puzzles' },
  { handle: 'endgamebot', blurb: 'endgame training' },
  { handle: 'statbot', blurb: 'server statistics' },
];

function BotCard({
  handle,
  blurb,
  onAsk,
  onTalk,
}: {
  handle: string;
  blurb: string;
  onAsk: (command: string) => void;
  onTalk: () => void;
}) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{handle}</div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>{blurb}</div>
      <div style={{ ...row, gap: 6 }}>
        <CommandButton label="help" command={`tell ${handle} help`} run={onAsk} />
        <CommandButton label="finger" command={`finger ${handle}`} run={onAsk} />
        <button
          style={btn}
          onClick={onTalk}
          title={`type "tell ${handle} " into the input line — it does not send`}
        >
          talk to
        </button>
      </div>
    </div>
  );
}

/** A button that says what it sends, and sends exactly that. */
function CommandButton({
  label,
  command,
  run,
  big,
  disabled,
}: {
  label: string;
  command: string;
  run: (command: string) => void;
  big?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      style={{
        ...btn,
        ...(big ? bigBtn : null),
        opacity: disabled ? 0.4 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
      }}
      disabled={disabled}
      title={`sends: ${command}`}
      onClick={() => run(command)}
    >
      <span>{label}</span>
      <span style={commandHint}>{command}</span>
    </button>
  );
}

const heading = { margin: 0, fontSize: 16 } as const;

const subtitle = { fontWeight: 400, fontSize: 12, opacity: 0.6 } as const;

const section = { marginTop: 22 } as const;

const sectionTitle = {
  margin: '0 0 4px',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  opacity: 0.7,
} as const;

const note = {
  margin: '0 0 10px',
  fontSize: 12,
  opacity: 0.6,
  lineHeight: 1.5,
  maxWidth: 640,
} as const;

const row = { display: 'flex', gap: 10, flexWrap: 'wrap' } as const;

const cardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 10,
} as const;

const card = {
  border: '1px solid var(--border-soft)',
  borderRadius: 6,
  background: 'var(--bg-raised)',
  padding: 12,
} as const;

const btn = {
  padding: '6px 12px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
} as const;

const bigBtn = { padding: '10px 16px', fontSize: 14 } as const;

const commandHint = {
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 10,
  opacity: 0.55,
} as const;

const code = {
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 11,
} as const;

const handleBox = {
  padding: '6px 10px',
  fontSize: 13,
  background: 'var(--bg-sunken)',
  color: 'var(--fg)',
  border: '1px solid var(--border-soft)',
  borderRadius: 4,
  fontFamily: '"SF Mono", Consolas, monospace',
  width: 140,
} as const;
