# Raptor3000

Modern web FICS chess client. Spiritual successor to Raptor (2005–2016), rebuilt
with an event-driven architecture that cleanly separates FICS-protocol parsing
from UI concerns.

## Credit

**The chat event system — taxonomy, parser contract, priority-ordered parser
chain, per-line regex heuristics, `IcsParser.parse()` control flow, title
stripping, and the outbound-message pipeline (Maciejg encoding, long-tell
splitting, `ChatType.OUTBOUND` echo) — is ported directly from the Raptor
project**
(<https://github.com/fbergo/Raptor>, 2005–2016, BSD license).

Where our TypeScript code diverges from Raptor's Java, Raptor is the
authoritative reference. The Raptor authors did the hard protocol-archaeology
work over a decade; this project stands on their shoulders.

The `GameService` listener-interface + per-event-type emitters, the
`Style12`/`G1`/`B1` message structs, the `Game` state-bitmask flags, and
the Offer model are likewise ports of Raptor's `service/GameService.java`
and `connector/ics/game/message/*.java`.

## Status

Scaffolding stage. The parser taxonomy, event dispatch, and a handful of reference
parsers exist. Everything else — FICS WebSocket, Timeseal, board rendering,
Stockfish — will be ported piece-by-piece from Simple-FICS-Interface.

## Architecture

Two parallel pipelines, both observer-pattern:

- **ChatService** fans out `ChatEvent` objects (tells, shouts, channel messages,
  notifications, info-command dumps) to tab stores that self-filter via `accepts()`.
- **GameService** (to be built) fans out strongly-typed game messages (Style12,
  G1, B1, game-end, etc.) keyed by gameId to per-game stores.

This split mirrors Raptor's `ChatService` + `GameService` (Java). The reason:
game events are high-frequency (every clock tick, every move) and routing them
through the chat plumbing pollutes logs and scrolls tabs unnecessarily.

### Parser registry

`FicsParser` holds a manually-ordered list of `ChatEventParser`s. First match
wins. Order = priority. Each parser is a pure function from line → event-or-null,
trivially unit-testable.

Add a parser: create a class that implements `ChatEventParser`, register it in
`defaultParsers.ts` in the right position, and add a test.

### Event types

`ChatEventType` is the canonical taxonomy (~35 values, modeled on Raptor's
`ChatType.java`). `categoryOf()` groups types for UI coloring/filtering.

## Layout

```
packages/
  shared/   # event types, parser registry, services. No UI deps.
  web/      # React + Vite + MobX. Depends on shared.
```

## Roadmap

### Foundation (done)

- [x] Project scaffolding, monorepo
- [x] Vite + React dev playground
- [x] **Chat event taxonomy at exact Raptor parity** — all 35 ChatType.java values
- [x] **Game event taxonomy at exact Raptor parity** — all 13 GameService fire* methods
- [x] Game state bitmask flags (Game.java constants)
- [x] Message POJO types (Style12, G1, B1, GameEnd, Moves, IllegalMove, NoLongerExaminingGame, RemovingObsGame)
- [x] Offer + OfferType + GameInfo models
- [x] ChatEventParser contract + FicsParser orchestrator
- [x] ChatService fan-out with self-filtering listeners
- [x] GameService emitter + listener interface
- [x] Reference chat parsers: TELL, CHANNEL_TELL, SHOUT

### Chat parsers (done — 22 / 22 at Raptor priority parity)

- [x] All 22 chat parsers: PartnerTell, Told, ChannelTell, Cshout, Shout, Kibitz, Tell, Whisper, QTell, Challenge, PartnershipCreated, PartnershipEnded, Following, DrawOffered, AbortRequested, History, Journal, Finger, BugWhoAll, Notification, Variables, Ping
- [x] stripTitles helper for FICS title markers
- [x] 52 passing tests

### Game parsers (done — 11 / 11 at Raptor parity)

- [x] Style12Parser, G1Parser, B1Parser
- [x] GameEndParser, IllegalMoveParser
- [x] NoLongerExaminingGameParser, RemovingObsGameParser
- [x] TakebackParser (stateful across lines)
- [x] SoughtParser, GameInfoParser, MovesParser
- [x] RaptorTokenizer utility (parity with `RaptorStringTokenizer`)
- [x] FicsParser wiring: typed messages dispatched to GameService
- [x] 29 new passing tests, 87 total

### Port from Simple-FICS-Interface

- [x] **FICS WebSocket + Timeseal2 connector** — `wss://www.freechess.org:5001`, full Timeseal2 handshake, guest-login state machine, line-buffered feed into `FicsParser.parseStream`
- [ ] Chess engine + variants (ChessAPI — standard, crazyhouse, atomic, 960, suicide, losers, wild)
- [x] Board UI: drag/drop + piece sets (Chess Ascent port, 2026-08-12) — animations pending
- [ ] Stockfish WASM wrapper (for non-playing modes only)

### End-to-end flow (done — green via Playwright against real FICS)

- [x] Guest login → chat popup auto-opens → FICS banner streams in
- [x] `observe /b` → board popup spawns via GameService on first `<12>`
- [x] Board renders pieces + clocks + "last move" / "to move" from Style12
- [x] Unicode piece glyphs as a first-pass renderer
- [x] Playwright E2E smoke test (`yarn workspace @raptor3000/web e2e`)

### UI / features

- [x] FICS login gate with profiles (Primary/Secondary/Tertiary) + auto-login
- [x] Post-login page is a menu (Options / Seek / Help) — not a window launcher
- [x] Day / Night / System theme toggle in top-right, persisted
- [x] Inline Seek tab (placeholder — scatter-plot rendering pending)
- [x] Help page with Linux/Windows/macOS instructions for chromeless `--app` mode
- [ ] Per-gameId GameStore + GameRegistry (replace single-game assumption)
- [ ] Tab stores: MainConsole, Channel, Person, RegEx, GameChat, BughousePartner
- [x] Real chess piece sets + drag/drop board interaction (2026-08-12, ported from chessascent.app)
- [ ] Seek graph scatter-plot rendering
- [ ] PGN import/export
- [ ] User scripts / aliases

## Running

```sh
yarn install
yarn workspace @raptor3000/shared test       # parser unit tests
yarn dev                                      # web dev server on :5173
```

## License

MIT — see `LICENSE`.
