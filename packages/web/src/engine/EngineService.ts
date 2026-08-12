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

/** One search line. With MultiPV=1 there is exactly one, rank 1. */
export interface EngineLine {
  /** 1-based MultiPV rank (1 = best). */
  multipv: number;
  depth: number;
  /** Centipawn score from the side-to-move's perspective, or null on mate. */
  scoreCp: number | null;
  /** Mate-in-N, positive=side-to-move mates, negative=gets mated. Null if eval. */
  scoreMate: number | null;
  /** Principal variation as a sequence of UCI moves ("e2e4 e7e5 ..."). */
  pv: readonly string[];
}

export interface EngineAnalysis {
  /** UCI search depth reached (best line's). */
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
  /** All current lines, sorted by multipv rank. Length tracks MultiPV. */
  lines: readonly EngineLine[];
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
  private multiPv = 1;
  private pendingMultiPv: number | null = null;
  private lastRequest: { fen: string; opts: { depth?: number; movetime?: number } } | null = null;

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

  /**
   * Number of lines the engine searches. Changing it restarts the
   * current analysis (UCI requires setoption outside a search).
   */
  setMultiPv(n: number): void {
    const clamped = Math.max(1, Math.min(5, Math.floor(n)));
    if (clamped === this.multiPv) return;
    this.multiPv = clamped;
    if (!this.worker) return;
    if (this.state === 'analyzing') {
      // Stockfish silently ignores setoption while searching — the
      // 2026-08-12 "multi line shows one line" bug. Stop the search and
      // apply the option when its bestmove confirms it actually ended.
      this.pendingMultiPv = clamped;
      this.send('stop');
      return;
    }
    this.applyMultiPv(clamped);
  }

  private applyMultiPv(n: number): void {
    this.send(`setoption name MultiPV value ${n}`);
    if (this.lastRequest) this.analyze(this.lastRequest.fen, this.lastRequest.opts);
  }

  getMultiPv(): number {
    return this.multiPv;
  }

  /** Replace the position and start a new analysis. Cancels any prior search. */
  analyze(fen: string, opts: { depth?: number; movetime?: number } = {}): void {
    if (!this.worker || this.state === 'starting') {
      // Buffer until ready: queue a single pending request.
      this.pending = { fen, opts };
      return;
    }
    this.pending = null;
    this.lastRequest = { fen, opts };
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
      // A MultiPV change that arrived mid-search applies now that the
      // search has provably ended, then restarts the analysis.
      if (this.pendingMultiPv !== null) {
        const n = this.pendingMultiPv;
        this.pendingMultiPv = null;
        this.applyMultiPv(n);
      }
    }
  }
}

/**
 * Parse a `info depth ... score cp/mate ... pv ...` line into a partial
 * EngineAnalysis. Returns null for non-search info lines (currmove, etc).
 */
export function parseUciInfo(line: string): ParsedUciInfo | null {
  // Only act on lines that contain a depth + (score|pv).
  if (!/\bdepth\b/.test(line)) return null;
  if (!/(\bscore\b|\bpv\b)/.test(line)) return null;

  const tokens = line.split(/\s+/);
  let depth: number | undefined;
  let multipv = 1;
  let scoreCp: number | null = null;
  let scoreMate: number | null = null;
  let nps: number | undefined;
  let pvIdx = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'depth' && tokens[i + 1]) {
      depth = parseInt(tokens[i + 1], 10);
    } else if (t === 'multipv' && tokens[i + 1]) {
      multipv = parseInt(tokens[i + 1], 10) || 1;
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
  return { multipv, depth, scoreCp, scoreMate, pv, nps };
}

export interface ParsedUciInfo {
  multipv: number;
  depth: number;
  scoreCp: number | null;
  scoreMate: number | null;
  pv: string[];
  nps: number | undefined;
}

/**
 * Fold one parsed info line into the analysis. Each MultiPV rank keeps
 * its own line; the analysis-level fields mirror rank 1 so existing
 * single-line consumers see exactly what they always saw.
 */
function mergeAnalysis(
  prev: EngineAnalysis | null,
  next: ParsedUciInfo,
): EngineAnalysis {
  const newLine: EngineLine = {
    multipv: next.multipv,
    depth: next.depth,
    scoreCp: next.scoreCp,
    scoreMate: next.scoreMate,
    pv: next.pv,
  };
  const lines = (prev?.lines ?? [])
    .filter(l => l.multipv !== next.multipv)
    .concat(newLine)
    .sort((a, b) => a.multipv - b.multipv);
  const best = lines[0];
  return {
    depth: best.depth,
    scoreCp: best.scoreCp,
    scoreMate: best.scoreMate,
    pv: best.pv,
    nps: next.nps ?? prev?.nps ?? 0,
    bestMove: best.pv[0] ?? prev?.bestMove ?? null,
    lines,
  };
}
