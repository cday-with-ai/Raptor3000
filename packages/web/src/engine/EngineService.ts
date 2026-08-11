/**
 * Stockfish UCI client.
 *
 * Loads `/stockfish/stockfish.js` (single-threaded WASM build) into a
 * Web Worker and talks to it via UCI commands. Exposes a small,
 * reactive surface:
 *
 *   const engine = new EngineService();
 *   engine.start();
 *   engine.onAnalysis(info => console.log(info));
 *   engine.analyze('rnbqkbnr/...', { depth: 18 });
 *   engine.stop();
 *
 * The service is designed to be a SINGLETON per main window — one
 * Stockfish process can analyze whichever game is currently focused.
 *
 * Anti-cheating: callers (EngineManager) decide whether to call
 * `analyze()`. We never auto-start on PLAYING-mode games.
 */

export interface EngineAnalysis {
  /** UCI search depth reached. */
  depth: number;
  /** Centipawn score from the side-to-move's perspective, or null on mate. */
  scoreCp: number | null;
  /** Mate-in-N, positive=side-to-move mates, negative=gets mated. Null if eval. */
  scoreMate: number | null;
  /** Principal variation as a sequence of UCI moves ("e2e4 e7e5 ..."). */
  pv: readonly string[];
  /** Nodes per second the engine is hitting. */
  nps: number;
  /** Best move found so far (first PV move; updated as PV updates). */
  bestMove: string | null;
}

export type EngineState = 'idle' | 'starting' | 'ready' | 'analyzing' | 'stopped';

export type AnalysisListener = (info: EngineAnalysis) => void;
export type StateListener = (state: EngineState) => void;

const ENGINE_URL = '/stockfish/stockfish.js';

export class EngineService {
  private worker: Worker | null = null;
  private state: EngineState = 'idle';
  private readonly analysisListeners = new Set<AnalysisListener>();
  private readonly stateListeners = new Set<StateListener>();
  private currentAnalysis: EngineAnalysis | null = null;

  /** Start the Stockfish worker and run UCI handshake. Idempotent. */
  start(): void {
    if (this.worker) return;
    this.setState('starting');
    const worker = new Worker(ENGINE_URL);
    this.worker = worker;
    worker.onmessage = ev => this.handleLine(typeof ev.data === 'string' ? ev.data : '');
    worker.onerror = err => {
       
      console.error('[EngineService] worker error', err);
      this.setState('stopped');
    };
    this.send('uci');
  }

  /** Tear down the worker and free the WASM memory. */
  stop(): void {
    if (!this.worker) return;
    try { this.send('stop'); } catch { /* ignore */ }
    try { this.send('quit'); } catch { /* ignore */ }
    this.worker.terminate();
    this.worker = null;
    this.setState('stopped');
  }

  /** Replace the position and start a new analysis. Cancels any prior search. */
  analyze(fen: string, opts: { depth?: number; movetime?: number } = {}): void {
    if (!this.worker || this.state === 'starting') {
      // Buffer until ready: queue a single pending request.
      this.pending = { fen, opts };
      return;
    }
    this.pending = null;
    this.send('stop');
    this.send(`position fen ${fen}`);
    this.currentAnalysis = null;
    if (opts.movetime) {
      this.send(`go movetime ${opts.movetime}`);
    } else {
      this.send(`go depth ${opts.depth ?? 18}`);
    }
    this.setState('analyzing');
  }

  /** Cancel current search but keep the engine warm for the next analyze(). */
  pause(): void {
    if (!this.worker) return;
    this.send('stop');
    if (this.state === 'analyzing') this.setState('ready');
  }

  getState(): EngineState {
    return this.state;
  }

  getCurrentAnalysis(): EngineAnalysis | null {
    return this.currentAnalysis;
  }

  onAnalysis(cb: AnalysisListener): () => void {
    this.analysisListeners.add(cb);
    return () => this.analysisListeners.delete(cb);
  }

  onState(cb: StateListener): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  // ---- internals ----

  private pending: { fen: string; opts: { depth?: number; movetime?: number } } | null = null;

  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private setState(s: EngineState): void {
    if (this.state === s) return;
    this.state = s;
    for (const l of this.stateListeners) l(s);
  }

  private handleLine(line: string): void {
    if (!line) return;
    if (line === 'uciok') {
      this.send('isready');
      return;
    }
    if (line === 'readyok') {
      this.setState('ready');
      // Drain any analyze request that came in while starting.
      if (this.pending) {
        const { fen, opts } = this.pending;
        this.pending = null;
        this.analyze(fen, opts);
      }
      return;
    }
    if (line.startsWith('info ')) {
      const parsed = parseUciInfo(line);
      if (parsed) {
        this.currentAnalysis = mergeAnalysis(this.currentAnalysis, parsed);
        for (const l of this.analysisListeners) l(this.currentAnalysis);
      }
      return;
    }
    if (line.startsWith('bestmove ')) {
      // Final answer from the search. Update the current analysis with the
      // bestmove and notify; engine is now back to ready.
      const m = /^bestmove\s+(\S+)/.exec(line);
      if (m && this.currentAnalysis) {
        this.currentAnalysis = { ...this.currentAnalysis, bestMove: m[1] };
        for (const l of this.analysisListeners) l(this.currentAnalysis);
      }
      this.setState('ready');
    }
  }
}

/**
 * Parse a `info depth ... score cp/mate ... pv ...` line into a partial
 * EngineAnalysis. Returns null for non-search info lines (currmove, etc).
 */
export function parseUciInfo(line: string): Partial<EngineAnalysis> | null {
  // Only act on lines that contain a depth + (score|pv).
  if (!/\bdepth\b/.test(line)) return null;
  if (!/(\bscore\b|\bpv\b)/.test(line)) return null;

  const tokens = line.split(/\s+/);
  let depth: number | undefined;
  let scoreCp: number | null = null;
  let scoreMate: number | null = null;
  let nps: number | undefined;
  let pvIdx = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'depth' && tokens[i + 1]) {
      depth = parseInt(tokens[i + 1], 10);
    } else if (t === 'nps' && tokens[i + 1]) {
      nps = parseInt(tokens[i + 1], 10);
    } else if (t === 'score' && tokens[i + 1] && tokens[i + 2]) {
      const kind = tokens[i + 1];
      const val = parseInt(tokens[i + 2], 10);
      if (kind === 'cp') scoreCp = val;
      else if (kind === 'mate') scoreMate = val;
    } else if (t === 'pv') {
      pvIdx = i + 1;
      break;
    }
  }

  if (depth === undefined) return null;
  const pv = pvIdx >= 0 ? tokens.slice(pvIdx) : [];
  return {
    depth,
    scoreCp,
    scoreMate,
    pv,
    nps: nps ?? 0,
    bestMove: pv[0] ?? null,
  };
}

function mergeAnalysis(
  prev: EngineAnalysis | null,
  next: Partial<EngineAnalysis>,
): EngineAnalysis {
  return {
    depth: next.depth ?? prev?.depth ?? 0,
    scoreCp: next.scoreCp !== undefined ? next.scoreCp : prev?.scoreCp ?? null,
    scoreMate: next.scoreMate !== undefined ? next.scoreMate : prev?.scoreMate ?? null,
    pv: next.pv ?? prev?.pv ?? [],
    nps: next.nps ?? prev?.nps ?? 0,
    bestMove: next.bestMove ?? prev?.bestMove ?? null,
  };
}
