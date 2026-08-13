# Third-party notices

Raptor3000's own code is MIT-licensed (see [LICENSE](LICENSE)). The app
stands on other people's work, and several of those pieces carry their
own licenses — including copyleft ones. This file is the honest
inventory.

**The practical upshot:** because the built app bundles GPL/AGPL
components (Stockfish, chessops, the sounds), a distributed build of
Raptor3000 as a whole must honor those terms — chiefly, keeping the
complete source available. It is: the entire project lives at the
repository this file ships in.

## Engine

- **[Stockfish](https://stockfishchess.org/)** — the chess engine, run
  in-browser as WebAssembly via the
  [`stockfish` npm package](https://www.npmjs.com/package/stockfish)
  (Chess.com's WASM build). **GPL-3.0.** Analysis in the engine panel is
  all Stockfish.

## Chess rules & data

- **[chessops](https://github.com/niklasf/chessops)** — lichess's
  TypeScript chess library; powers SAN replay, legality checks, and
  UCI→SAN conversion. **GPL-3.0-or-later.**
- **[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)**
  — the opening name/ECO dataset, fetched live with a baked fallback.
  **CC0 public domain** ("as a collection of facts, this data set is in
  the public domain").

## Sounds

- The board sounds are lichess's **piano** sound set by **Enigmahack**,
  from [lichess-org/lila](https://github.com/lichess-org/lila)
  `public/sound/piano/`. **AGPL-3.0-or-later.**
  (Deliberately not the famous "standard" lichess sounds — those are in
  lila `COPYING.md`'s "Exceptions (non-free)" list.)

## Piece sets

Carried over from [chessascent.app](https://chessascent.app) (Carson's
other app), which carries them from the lichess piece collection. Each
set keeps its own license:

- **cburnett** — Colin M.L. Burnett. **GPLv2+** (the lichess/Wikipedia
  set; the app default).
- **alpha** — Eric Bentzen. Free for personal, non-commercial use.
- **leipzig** — Armando Hernández Marroquín. **GPL.**
- **cardinal** — sadsnake1. **CC BY-NC-SA 4.0** (non-commercial).
- **mpchess** — Maxime Chupin. **GPLv3+.**

Raptor3000 is free and non-commercial, which is what the NC-restricted
sets require. If that ever changes, drop `cardinal` and `alpha` first.

## Libraries

- **[React](https://react.dev/)**, **[MobX](https://mobx.js.org/)**,
  **[Vite](https://vite.dev/)** — MIT.

## Lineage

Raptor3000 is the third of a line: **Raptor** (SWT, BSD) and
**Decaf** (Java) came first, from the same author.
The window layout, the console conventions, and half the feature ideas
are theirs. FICS itself — [freechess.org](https://www.freechess.org/) —
is the server this whole app exists to talk to.
