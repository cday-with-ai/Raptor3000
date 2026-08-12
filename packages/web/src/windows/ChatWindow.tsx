import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatEventType, tokenize, type ChatEvent } from '@raptor3000/shared';
import type { RaptorContext } from './appContext.js';
import { installPositionTracker, windowStorageKey } from './windowPosition.js';
import {
  fetchChannelHistory,
  mergeHistory,
  parseChannels,
} from '../channelHistory.js';
import {
  loadPreferences,
  type AppPreferences,
  type ChatLayout,
} from '../preferences.js';
import { saveLivePreference, useLivePreferences } from '../useLivePreferences.js';
import {
  chatColorFor,
  lineBody,
  listOwnerFrom,
  rowAction,
} from '../chatFormat.js';

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
 * The input line is raw FICS input in every mode and every tab — no
 * per-tab prefixing (Carson, 2026-08-12): you type `tell 39 hi` yourself,
 * exactly what gets sent.
 */
export const ChatWindow = function ChatWindow({
  context,
}: {
  context: RaptorContext;
}) {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [input, setInput] = useState('');
  // Readline-style input history: up/down walk previously sent lines,
  // cursor lands at the end, enter sends (Carson).
  const historyRef = useRef<string[]>([]);
  const historyPosRef = useRef<number>(-1); // -1 = live input
  const draftRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Backfill: the chessascent channel logger keeps the last 24h of
  // channel tells. Fetch each auto-join channel once and prepend, so
  // scrolling up shows the conversation from before login. Its channel
  // tabs also appear immediately instead of waiting for the first live
  // tell. Failures are silent — backfill must never break the console.
  const backfilled = useRef(false);
  useEffect(() => {
    if (backfilled.current) return;
    backfilled.current = true;
    const prefs = loadPreferences();
    if (!prefs.channelHistoryUrl) return;
    for (const channel of parseChannels(prefs.autoJoinChannels)) {
      void fetchChannelHistory(prefs.channelHistoryUrl, channel).then(history => {
        if (history.length === 0) return;
        setEvents(prev => {
          const next = mergeHistory(history, prev, channel);
          if (next.length > MAX_EVENTS) next.splice(0, next.length - MAX_EVENTS);
          return next;
        });
      });
    }
  }, []);

  // Derive tab list from events. Stable order: main, then channels by
  // first-seen order, then persons by first-seen order, then partner.
  const tabs = useMemo(() => deriveTabs(events), [events]);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const tabEvents = useMemo(
    () => events.filter(e => tabAccepts(activeTab, e)),
    [events, activeTab],
  );

  const prefs = useLivePreferences();
  const ownHandle = context.connector.getLoggedInAs?.() ?? null;

  // Layout mode, switchable inline (the movelist-control concept applied
  // to the window itself): plain stream / one-line tabs / Decaf split.
  const layout = prefs.chatLayout;
  const setLayout = (l: ChatLayout) => saveLivePreference('chatLayout', l);

  // Split mode wants a tab above the pinned main console; sitting on
  // "main" there means an empty top pane. Adopt the first real tab as
  // soon as one exists.
  useEffect(() => {
    if (layout !== 'split' || activeTab.kind !== 'main') return;
    const first = tabs.find(t => t.kind !== 'main');
    if (first) setActiveTabId(first.id);
  }, [layout, activeTab, tabs]);

  const submit = (line: string) => {
    if (line.length === 0) return;
    // History: newest last, no consecutive duplicates, capped.
    const h = historyRef.current;
    if (h[h.length - 1] !== line) h.push(line);
    if (h.length > 200) h.shift();
    historyPosRef.current = -1;
    const sent = context.connector.sendMessage(line);
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
      <div style={headerRow}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {layout === 'plain' ? (
            <span style={{ fontSize: 12, opacity: 0.6, padding: '6px 14px', display: 'inline-block' }}>
              console
            </span>
          ) : (
            <TabBar
              // In split mode the main console is always visible below —
              // a main tab up top would be redundant (Carson).
              tabs={layout === 'split' ? tabs.filter(t => t.kind !== 'main') : tabs}
              activeId={activeTab.id}
              onSelect={setActiveTabId}
              onClose={closeTab}
            />
          )}
        </div>
        <LayoutSwitcher layout={layout} onChange={setLayout} />
      </div>
      {layout !== 'split' || activeTab.kind === 'main' ? (
        <TabLog
          tab={layout === 'plain' ? MAIN_TAB : activeTab}
          events={layout === 'plain' ? events.filter(e => tabAccepts(MAIN_TAB, e)) : tabEvents}
          prefs={prefs}
          ownHandle={ownHandle}
          onCommand={cmd => context.connector.sendMessage(cmd)}
        />
      ) : (
        // Decaf-style split (Carson, 2026-08-12): the active tab on top,
        // the main console always visible underneath — you never lose
        // the stream by reading a channel. The divider drags; the ratio
        // is remembered like everything else.
        <SplitView
          ratio={prefs.chatSplitRatio}
          onRatio={r => saveLivePreference('chatSplitRatio', r)}
          top={
            <TabLog
              tab={activeTab}
              events={tabEvents}
              prefs={prefs}
              ownHandle={ownHandle}
              onCommand={cmd => context.connector.sendMessage(cmd)}
            />
          }
          bottom={
            <TabLog
              tab={MAIN_TAB}
              events={events.filter(e => tabAccepts(MAIN_TAB, e))}
              prefs={prefs}
              ownHandle={ownHandle}
              onCommand={cmd => context.connector.sendMessage(cmd)}
            />
          }
        />
      )}
      <form
        style={inputRow}
        onSubmit={e => {
          e.preventDefault();
          submit(input);
          setInput('');
        }}
      >
        <span style={prefixLabel}>{'>'}</span>
        <input
          ref={inputRef}
          style={inputBox}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            historyPosRef.current = -1;
          }}
          onKeyDown={e => {
            const h = historyRef.current;
            if (e.key === 'ArrowUp') {
              if (h.length === 0) return;
              e.preventDefault();
              if (historyPosRef.current === -1) {
                draftRef.current = input;
                historyPosRef.current = h.length - 1;
              } else if (historyPosRef.current > 0) {
                historyPosRef.current--;
              }
              const line = h[historyPosRef.current];
              setInput(line);
              requestAnimationFrame(() =>
                inputRef.current?.setSelectionRange(line.length, line.length),
              );
            } else if (e.key === 'ArrowDown') {
              if (historyPosRef.current === -1) return;
              e.preventDefault();
              historyPosRef.current++;
              const line =
                historyPosRef.current >= h.length
                  ? ((historyPosRef.current = -1), draftRef.current)
                  : h[historyPosRef.current];
              setInput(line);
              requestAnimationFrame(() =>
                inputRef.current?.setSelectionRange(line.length, line.length),
              );
            }
          }}
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

/**
 * Inline layout switcher — the movelist-control concept applied to the
 * window: three small links, active one bold, remembered as a preference.
 */
function LayoutSwitcher({
  layout,
  onChange,
}: {
  layout: ChatLayout;
  onChange: (l: ChatLayout) => void;
}) {
  const modes: [ChatLayout, string][] = [
    ['plain', 'plain'],
    ['tabs', 'tabs'],
    ['split', 'split'],
  ];
  return (
    <span style={{ display: 'inline-flex', gap: 2, padding: '0 8px', flexShrink: 0 }}>
      {modes.map(([mode, label]) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          title={
            mode === 'plain'
              ? 'one stream, no tabs'
              : mode === 'tabs'
                ? 'classic tabs, one pane'
                : 'tabs above, main console always visible'
          }
          style={{
            background: 'none',
            border: 'none',
            color: layout === mode ? 'var(--accent)' : 'var(--fg-dim)',
            fontWeight: layout === mode ? 700 : 400,
            cursor: 'pointer',
            fontSize: 11,
            padding: '2px 4px',
          }}
        >
          ({label})
        </button>
      ))}
    </span>
  );
}

interface Tab {
  id: string;
  kind: 'main' | 'channel' | 'person' | 'partner';
  label: string;
  /** For channel tabs. */
  channel?: string;
  /** For person tabs. */
  person?: string;
}

const MAIN_TAB: Tab = {
  id: 'main',
  kind: 'main',
  label: 'main',
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
      { id: tabId, kind: 'channel', label: '', channel },
      e,
    );
  }
  if (tabId.startsWith('person:')) {
    const person = tabId.slice(7);
    return tabAcceptsBy(
      { id: tabId, kind: 'person', label: '', person },
      e,
    );
  }
  if (tabId === 'partner') {
    return tabAcceptsBy(
      { id: 'partner', kind: 'partner', label: '' },
      e,
    );
  }
  return false;
}

function tabAcceptsBy(tab: Tab, e: ChatEvent): boolean {
  switch (tab.kind) {
    case 'main':
      // Backfilled channel history (older than this window) reads in its
      // channel tab only — main (and therefore plain mode) stays live
      // traffic. Identified by time, same rule as the [HH:MM] stamps.
      if (
        e.time < WINDOW_OPENED - 5_000 &&
        (e.type === ChatEventType.CHANNEL_TELL ||
          (e.type === ChatEventType.INTERNAL && e.channel !== null))
      ) {
        return false;
      }
      return true;
    case 'channel': {
      if (e.type === ChatEventType.CHANNEL_TELL && e.channel === tab.channel) return true;
      // Channel-scoped internal notes (the history separator).
      if (e.type === ChatEventType.INTERNAL && e.channel === tab.channel) return true;
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


function TabLog({
  tab,
  events,
  prefs,
  ownHandle,
  onCommand,
}: {
  tab: Tab;
  events: readonly ChatEvent[];
  prefs: AppPreferences;
  ownHandle: string | null;
  onCommand: (cmd: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length, tab.id]);

  // History/journal rows need the listing's owner to build the examine
  // command; the header line carries it. Walk the events once, in order.
  const owners = useMemo(() => {
    let owner: string | null = null;
    return events.map(e => {
      const found = listOwnerFrom(e.type === ChatEventType.UNKNOWN ? e.raw : e.message);
      if (found) owner = found;
      return owner;
    });
  }, [events]);

  return (
    <div
      ref={ref}
      style={{
        ...logView,
        fontFamily: prefs.chatFontFamily,
        fontSize: prefs.chatFontSize,
      }}
    >
      {events.length === 0 ? (
        <div style={{ opacity: 0.5 }}>
          {tab.kind === 'main'
            ? 'Connecting to FICS… events will appear here.'
            : '(no messages yet)'}
        </div>
      ) : (
        events.map((e, i) => (
          <ChatLine
            key={i}
            e={e}
            prefs={prefs}
            ownHandle={ownHandle}
            listOwner={owners[i]}
            onCommand={onCommand}
          />
        ))
      )}
    </div>
  );
}

/**
 * One rendered event: timestamp stamp for backfill, per-type color,
 * Maciejg-decoded text, URLs as links, quotes set off, and server-list
 * rows (games / history / journal) as click-to-observe/examine targets.
 */
function ChatLine({
  e,
  prefs,
  ownHandle,
  listOwner,
  onCommand,
}: {
  e: ChatEvent;
  prefs: AppPreferences;
  ownHandle: string | null;
  listOwner: string | null;
  onCommand: (cmd: string) => void;
}) {
  const body = historyStamp(e) + lineBody(e, ownHandle);
  const color = chatColorFor(e, prefs);
  // Multi-line events (list output) get per-line row actions.
  const lines = body.split('\n');
  return (
    <div style={{ whiteSpace: 'pre-wrap', color }}>
      {lines.map((line, i) => {
        const action = rowAction(line, listOwner);
        const content = renderRich(line);
        if (!action) {
          return (
            <div key={i}>{content.length === 0 ? ' ' : content}</div>
          );
        }
        return (
          <div
            key={i}
            onClick={() => onCommand(action.command)}
            title={action.label}
            style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** Tokenized rich rendering: URLs become links, quoted spans italicize. */
function renderRich(line: string): React.ReactNode[] {
  return tokenize(line).map((t, i) => {
    switch (t.kind) {
      case 'url':
        return (
          <a
            key={i}
            href={t.value}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {t.value}
          </a>
        );
      case 'quote':
        return <em key={i}>{t.value}</em>;
      default:
        return <span key={i}>{t.value}</span>;
    }
  });
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
              borderRight: '1px solid var(--border-soft)',
              borderBottom: active
                ? '2px solid var(--accent)'
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


/** When this window opened — events older than this are backfill and get
 *  a timestamp prefix, since "when" is the point of reading history. */
const WINDOW_OPENED = Date.now();

function historyStamp(e: ChatEvent): string {
  if (e.time >= WINDOW_OPENED - 5_000) return '';
  const d = new Date(e.time);
  const hhmm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const sameDay = new Date(WINDOW_OPENED).toDateString() === d.toDateString();
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  return sameDay ? `[${hhmm}] ` : `[${day} ${hhmm}] `;
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
  overflowX: 'auto',
} as const;

// Header row: tab bar (or the plain-mode label) + the layout switcher.
// Carries the border/background the tab bar used to own, so the switcher
// sits inside the same strip.
const headerRow = {
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-soft)',
  background: 'var(--bg-raised)',
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
  height: '100%',
} as const;

/**
 * The Decaf split: tab pane above, persistent main console below, with
 * a draggable divider. During a drag the ratio is local state for
 * smoothness; on release it saves as a preference.
 */
function SplitView({
  top,
  bottom,
  ratio,
  onRatio,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
  ratio: number;
  onRatio: (r: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<number | null>(null);
  const r = live ?? ratio;
  const clamp = (v: number) => Math.min(0.85, Math.max(0.15, v));
  return (
    <div ref={ref} style={splitPane}>
      <div style={{ flex: `${r} 1 0%`, minHeight: 0, overflow: 'hidden' }}>{top}</div>
      <div
        style={splitDivider}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setLive(ratio);
        }}
        onPointerMove={e => {
          if (live === null) return;
          const rect = ref.current?.getBoundingClientRect();
          if (!rect || rect.height === 0) return;
          setLive(clamp((e.clientY - rect.top) / rect.height));
        }}
        onPointerUp={() => {
          if (live !== null) onRatio(clamp(live));
          setLive(null);
        }}
        onPointerCancel={() => setLive(null)}
      >
        Main:
      </div>
      <div style={{ flex: `${1 - r} 1 0%`, minHeight: 0, overflow: 'hidden' }}>{bottom}</div>
    </div>
  );
}

const splitPane = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
} as const;

const splitDivider = {
  fontSize: 11,
  fontWeight: 700,
  opacity: 0.7,
  padding: '2px 12px',
  borderTop: '1px solid var(--border-soft)',
  borderBottom: '1px solid var(--border-soft)',
  background: 'var(--bg-raised)',
  flexShrink: 0,
  cursor: 'row-resize',
  userSelect: 'none',
  touchAction: 'none',
} as const;

const inputRow = {
  display: 'flex',
  gap: 6,
  padding: 8,
  borderTop: '1px solid var(--border-soft)',
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
  border: '1px solid var(--border-soft)',
  borderRadius: 4,
  fontFamily: '"SF Mono", Consolas, monospace',
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
