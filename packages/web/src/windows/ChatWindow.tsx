import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyTabPrefix,
  ChatEventType,
  type ChatEvent,
} from '@raptor3000/shared';
import type { RaptorContext } from './appContext.js';
import { installPositionTracker, windowStorageKey } from './windowPosition.js';

/**
 * Chat window — connected FICS console with per-channel / per-person tabs.
 *
 * This runs in a POPUP window separate from main. MobX observables created
 * in the main window are NOT reactive in the popup (each window has its
 * own MobX runtime), so we drive the UI with plain React state, filtering
 * a local event log per tab.
 *
 * Tab list is derived from the event stream: every channel we see a
 * CHANNEL_TELL for gets a tab, every person who tells us gets a tab,
 * and `ptell` opens the partner tab. The main console is always present.
 *
 * When the user types a message, we prepend the active tab's prefix
 * (`tell 50 `, `tell alice `, `ptell `, or nothing for main) so the input
 * flows to the right place — via `applyTabPrefix`, so typing the command out
 * of habit doesn't send `tell 50 tell 50 ...`.
 */
export const ChatWindow = function ChatWindow({
  context,
}: {
  context: RaptorContext;
}) {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [input, setInput] = useState('');

  useEffect(() => installPositionTracker(windowStorageKey('chat')), []);

  // Subscribe to every chat event and fold into local state.
  useEffect(() => {
    const id = `chat-window-${Math.random().toString(36).slice(2)}`;
    const listener = {
      id,
      accepts: () => true,
      handle: (e: ChatEvent) => {
        setEvents(prev => {
          const next = prev.concat(e);
          if (next.length > MAX_EVENTS) next.splice(0, next.length - MAX_EVENTS);
          return next;
        });
      },
    };
    context.chatService.addMainConsoleListener(listener);
    return () => context.chatService.removeListener(id);
  }, [context]);

  // Derive tab list from events. Stable order: main, then channels by
  // first-seen order, then persons by first-seen order, then partner.
  const tabs = useMemo(() => deriveTabs(events), [events]);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const tabEvents = useMemo(
    () => events.filter(e => tabAccepts(activeTab, e)),
    [events, activeTab],
  );

  const submit = (line: string) => {
    if (line.length === 0) return;
    const sent = context.connector.sendMessage(applyTabPrefix(activeTab.prefix, line));
    if (!sent) {
      // Not connected — synthesize an INTERNAL event so the user sees it.
      setEvents(prev =>
        prev.concat({
          type: ChatEventType.INTERNAL,
          raw: '',
          time: Date.now(),
          source: null,
          channel: null,
          gameId: null,
          message: '(not connected — command not sent)',
          pingMs: null,
        }),
      );
    }
  };

  const closeTab = (id: string) => {
    if (id === 'main') return;
    if (id === activeTab.id) setActiveTabId('main');
    setEvents(prev => prev.filter(e => !tabAcceptsById(id, e)));
  };

  return (
    <div style={shell}>
      <TabBar
        tabs={tabs}
        activeId={activeTab.id}
        onSelect={setActiveTabId}
        onClose={closeTab}
      />
      <TabLog tab={activeTab} events={tabEvents} />
      <form
        style={inputRow}
        onSubmit={e => {
          e.preventDefault();
          submit(input);
          setInput('');
        }}
      >
        <span style={prefixLabel}>
          {activeTab.prefix || '>'}
        </span>
        <input
          style={inputBox}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholderFor(activeTab)}
          autoFocus
        />
        <button style={btn} type="submit">
          Send
        </button>
      </form>
    </div>
  );
};

const MAX_EVENTS = 5000;

interface Tab {
  id: string;
  kind: 'main' | 'channel' | 'person' | 'partner';
  label: string;
  prefix: string;
  /** For channel tabs. */
  channel?: string;
  /** For person tabs. */
  person?: string;
}

const MAIN_TAB: Tab = {
  id: 'main',
  kind: 'main',
  label: 'main',
  prefix: '',
};

function deriveTabs(events: readonly ChatEvent[]): Tab[] {
  const channels = new Map<string, Tab>();
  const persons = new Map<string, Tab>();
  let hasPartner = false;
  for (const e of events) {
    switch (e.type) {
      case ChatEventType.CHANNEL_TELL:
        if (e.channel && !channels.has(e.channel)) {
          channels.set(e.channel, {
            id: 'channel:' + e.channel,
            kind: 'channel',
            label: '#' + e.channel,
            prefix: `tell ${e.channel} `,
            channel: e.channel,
          });
        }
        break;
      case ChatEventType.TELL:
      case ChatEventType.TOLD:
        if (e.source) {
          const key = e.source.toLowerCase();
          if (!persons.has(key)) {
            persons.set(key, {
              id: 'person:' + key,
              kind: 'person',
              label: e.source,
              prefix: `tell ${e.source} `,
              person: e.source,
            });
          }
        }
        break;
      case ChatEventType.PARTNER_TELL:
        hasPartner = true;
        break;
      case ChatEventType.OUTBOUND: {
        const m = /^tell\s+(\S+)\s+/i.exec(e.message);
        if (m) {
          const target = m[1];
          if (/^\d+$/.test(target)) {
            if (!channels.has(target)) {
              channels.set(target, {
                id: 'channel:' + target,
                kind: 'channel',
                label: '#' + target,
                prefix: `tell ${target} `,
                channel: target,
              });
            }
          } else {
            const key = target.toLowerCase();
            if (!persons.has(key)) {
              persons.set(key, {
                id: 'person:' + key,
                kind: 'person',
                label: target,
                prefix: `tell ${target} `,
                person: target,
              });
            }
          }
        } else if (/^ptell\s+/i.test(e.message)) {
          hasPartner = true;
        }
        break;
      }
    }
  }
  const list: Tab[] = [MAIN_TAB, ...channels.values(), ...persons.values()];
  if (hasPartner) {
    list.push({
      id: 'partner',
      kind: 'partner',
      label: 'partner',
      prefix: 'ptell ',
    });
  }
  return list;
}

function tabAccepts(tab: Tab, e: ChatEvent): boolean {
  return tabAcceptsBy(tab, e);
}

function tabAcceptsById(tabId: string, e: ChatEvent): boolean {
  // Reconstruct tab spec from id for filtering.
  if (tabId === 'main') return true;
  if (tabId.startsWith('channel:')) {
    const channel = tabId.slice(8);
    return tabAcceptsBy(
      { id: tabId, kind: 'channel', label: '', prefix: '', channel },
      e,
    );
  }
  if (tabId.startsWith('person:')) {
    const person = tabId.slice(7);
    return tabAcceptsBy(
      { id: tabId, kind: 'person', label: '', prefix: '', person },
      e,
    );
  }
  if (tabId === 'partner') {
    return tabAcceptsBy(
      { id: 'partner', kind: 'partner', label: '', prefix: '' },
      e,
    );
  }
  return false;
}

function tabAcceptsBy(tab: Tab, e: ChatEvent): boolean {
  switch (tab.kind) {
    case 'main':
      return true;
    case 'channel': {
      if (e.type === ChatEventType.CHANNEL_TELL && e.channel === tab.channel) return true;
      if (e.type === ChatEventType.OUTBOUND) {
        return e.message.startsWith(`tell ${tab.channel} `);
      }
      return false;
    }
    case 'person': {
      const target = (tab.person ?? '').toLowerCase();
      if (e.type === ChatEventType.TELL && e.source?.toLowerCase() === target) return true;
      if (e.type === ChatEventType.TOLD && e.source?.toLowerCase() === target) return true;
      if (e.type === ChatEventType.OUTBOUND) {
        return e.message.toLowerCase().startsWith(`tell ${target} `);
      }
      return false;
    }
    case 'partner': {
      if (e.type === ChatEventType.PARTNER_TELL) return true;
      if (e.type === ChatEventType.OUTBOUND) return e.message.startsWith('ptell ');
      return false;
    }
  }
}

function placeholderFor(tab: Tab): string {
  switch (tab.kind) {
    case 'channel': return `message channel ${tab.channel}…`;
    case 'person': return `tell ${tab.person}…`;
    case 'partner': return `ptell your partner…`;
    default: return 'FICS command — e.g. observe /l, tell 4 hi';
  }
}

function TabLog({ tab, events }: { tab: Tab; events: readonly ChatEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length, tab.id]);
  return (
    <div ref={ref} style={logView}>
      {events.length === 0 ? (
        <div style={{ opacity: 0.5 }}>
          {tab.kind === 'main'
            ? 'Connecting to FICS… events will appear here.'
            : '(no messages yet)'}
        </div>
      ) : (
        events.map((e, i) => (
          <div
            key={i}
            style={{
              whiteSpace: 'pre-wrap',
              color: colorFor(e),
            }}
          >
            {formatLine(e)}
          </div>
        ))
      )}
    </div>
  );
}

function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
}: {
  tabs: readonly Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div style={tabBar}>
      {tabs.map(tab => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              padding: '6px 14px',
              background: active ? 'var(--bg-sunken)' : 'transparent',
              borderRight: '1px solid #2a2f38',
              borderBottom: active
                ? '2px solid #7bb8ff'
                : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{tab.label}</span>
            {tab.kind !== 'main' && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                style={closeBtn}
                title="Close tab"
                aria-label="Close tab"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <span style={{ flex: 1 }} />
    </div>
  );
}

function colorFor(e: ChatEvent): string {
  switch (e.type) {
    case ChatEventType.INTERNAL: return '#888';
    case ChatEventType.OUTBOUND: return '#7bb8ff';
    case ChatEventType.TELL:
    case ChatEventType.TOLD:
    case ChatEventType.PARTNER_TELL:
      return '#8fe08f';
    case ChatEventType.CHANNEL_TELL:
      return '#c9b070';
    default:
      return 'var(--fg)';
  }
}

function formatLine(e: ChatEvent): string {
  switch (e.type) {
    case ChatEventType.INTERNAL: return `· ${e.message}`;
    case ChatEventType.OUTBOUND: return `> ${e.message}`;
    case ChatEventType.TELL:
      return `${e.source ?? '?'} tells you: ${e.message}`;
    case ChatEventType.TOLD:
      return `(told ${e.source ?? '?'}): ${e.message}`;
    case ChatEventType.CHANNEL_TELL:
      return `${e.source ?? '?'}(${e.channel ?? '?'}): ${e.message}`;
    case ChatEventType.SHOUT:
      return `${e.source ?? '?'} shouts: ${e.message}`;
    case ChatEventType.CSHOUT:
      return `${e.source ?? '?'} c-shouts: ${e.message}`;
    case ChatEventType.KIBITZ:
      return `${e.source ?? '?'}[${e.gameId ?? '?'}] kibitzes: ${e.message}`;
    case ChatEventType.WHISPER:
      return `${e.source ?? '?'}[${e.gameId ?? '?'}] whispers: ${e.message}`;
    case ChatEventType.PARTNER_TELL:
      return `partner tells you: ${e.message}`;
    case ChatEventType.NOTIFICATION_ARRIVAL:
      return `+ ${e.source ?? '?'} has arrived.`;
    case ChatEventType.NOTIFICATION_DEPARTURE:
      return `- ${e.source ?? '?'} has departed.`;
    case ChatEventType.UNKNOWN:
      return e.raw;
    default:
      return `[${e.type}] ${e.message || e.raw}`;
  }
}

const shell = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr auto',
  height: '100vh',
  width: '100vw',
  background: 'var(--bg)',
  color: 'var(--fg)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  overflow: 'hidden',
} as const;

const tabBar = {
  display: 'flex',
  alignItems: 'stretch',
  borderBottom: '1px solid #2a2f38',
  background: 'var(--bg-raised)',
  overflowX: 'auto',
} as const;

const closeBtn = {
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  fontSize: 14,
  lineHeight: 1,
  cursor: 'pointer',
  padding: '0 2px',
  opacity: 0.5,
} as const;

const logView = {
  padding: 12,
  overflow: 'auto',
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 13,
  lineHeight: 1.5,
} as const;

const inputRow = {
  display: 'flex',
  gap: 6,
  padding: 8,
  borderTop: '1px solid #2a2f38',
  background: 'var(--bg-raised)',
  alignItems: 'center',
} as const;

const prefixLabel = {
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 13,
  opacity: 0.6,
  paddingLeft: 6,
} as const;

const inputBox = {
  flex: 1,
  padding: '6px 10px',
  fontSize: 14,
  background: 'var(--bg-sunken)',
  color: 'var(--fg)',
  border: '1px solid #2a2f38',
  borderRadius: 4,
  fontFamily: '"SF Mono", Consolas, monospace',
} as const;

const btn = {
  padding: '6px 12px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid #3a4150',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
} as const;
