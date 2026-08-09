import { describe, it, expect } from 'vitest';
import { FicsConnector } from '../FicsConnector.js';
import { ChatService } from '../ChatService.js';
import { GameService } from '../GameService.js';
import { FicsParser } from '../../parsers/FicsParser.js';
import {
  defaultChatParsers,
  defaultGameLineParsers,
  defaultChunkParsers,
} from '../../parsers/defaultParsers.js';
import { BoardMode } from '../../models/BoardMode.js';
import { lastMoveSquares, parseSquare } from '../../display/chessAlg.js';
import type { ChatEvent } from '../../events/ChatEvent.js';

/**
 * Connector → board seam test.
 *
 * 111 tests passed while "boards don't work" was true, because every one of
 * them stopped short of this seam: raw server bytes, as the WebSocket
 * actually delivers them (`\n\r` endings, `fics% ` prompts, timeseal acks,
 * lines split across chunks), through the connector's normalization into
 * FicsParser, out of GameService's lifecycle hooks, into the listener shape
 * GameManager registers, ending at the exact `position[rank][file]` codes
 * BoardWindow paints. This file walks that whole path with a recorded
 * observe session and asserts a board would open and render 1.e4.
 *
 * What it cannot cover: the React render itself and the popup-blocking
 * behavior of a real browser (packages/web, needs a DOM).
 */

// Piece codes at Raptor GameConstants parity (see Style12Parser).
const EMPTY = 0;
const WP = 1, WK = 6, BP = 7, BR = 10, BK = 12;

// Recorded shape of an observe session against freechess.org: the game
// announcement, the <g1> metadata, then the first <12>. FICS terminates
// lines with `\n\r`, trails a `fics% ` prompt (defprompt) with NO newline,
// and begins every subsequent block with `\n\r` — which is what terminates
// the buffered prompt line. That leading `\n\r` used to be load-bearing: a
// block arriving without it produces the line `fics% <12> ...`, which
// Style12Parser's startsWith('<12>') could not see. FicsParser now strips
// prompt echoes first (Raptor's filterTrailingPrompts, which our port had
// dropped), so that shape parses too — pinned below.
const ANNOUNCE_AND_G1 =
  '\n\rGame 95: GuestFOO (++++) GuestBAR (++++) unrated blitz 3 0\n\r\n\r' +
  '<g1> 95 p=0 t=blitz r=1 u=0,0 it=5,5 i=8,8 pt=0 rt=1586E,2100 ts=1,0\n\r';

// After 1.e4, relation=0 (observing live), clocks in ms (`iset ms 1`).
const S12_AFTER_E4 =
  '<12> rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR' +
  ' B 4 1 1 1 1 0 95 GuestFOO GuestBAR 0 3 0 39 39 180000 180000 1' +
  ' P/e2-e4 (0:00.000) e4 0 1 0';

// After 1.e4 e5 2.Nf3 Nf6 3.Bc4 Bc5 4.d3 O-O — black has castled and white
// has not, so the two back ranks disagree about where a king is. FICS writes
// the verbose move as bare `o-o` for either colour; this is the position that
// tells them apart.
const S12_AFTER_BLACK_CASTLES =
  '<12> rnbq-rk- pppp-ppp -----n-- --b-p--- --B-P--- ---P-N-- PPP--PPP RNBQK--R' +
  ' W -1 1 1 0 0 1 95 GuestFOO GuestBAR 0 3 0 39 39 175000 176000 5' +
  ' o-o (0:03.100) O-O 0 1 0';

// After 1...c5.
const S12_AFTER_C5 =
  '<12> rnbqkbnr pp-ppppp -------- --p----- ----P--- -------- PPPP-PPP RNBQKBNR' +
  ' W 2 1 1 1 1 0 95 GuestFOO GuestBAR 0 3 0 39 39 178500 179200 2' +
  ' P/c7-c5 (0:01.500) c5 0 1 0';

function makeSession() {
  const chatService = new ChatService();
  const gameService = new GameService();
  const parser = new FicsParser({
    chatParsers: defaultChatParsers(),
    gameLineParsers: defaultGameLineParsers(),
    chunkParsers: defaultChunkParsers(),
    gameService,
  });
  const connector = new FicsConnector({ chatService, gameService, parser });

  // Everything that would reach the main console.
  const chat: ChatEvent[] = [];
  chatService.addMainConsoleListener({
    id: 'test-console',
    accepts: () => true,
    handle: e => chat.push(e),
  });

  // The listener shape GameManager registers: board windows open from the
  // mode-specific start hooks, never from gameCreated.
  const openedWindows: string[] = [];
  gameService.addListener({
    onObsGameStart: id => openedWindows.push(id),
    onPlayingGameStart: id => openedWindows.push(id),
    onExGameStart: id => openedWindows.push(id),
    onSetupGameStart: id => openedWindows.push(id),
  });

  // handleRaw is the WebSocket onmessage path; private, reached by cast.
  // No socket exists, which also proves the path is inert without one.
  const feed = (raw: string) =>
    (connector as unknown as { handleRaw(r: string): void }).handleRaw(raw);

  return { feed, chat, openedWindows, gameService };
}

describe('connector → board seam (recorded observe session)', () => {
  it('opens a board and decodes the position from raw chunked traffic', () => {
    const { feed, openedWindows, gameService } = makeSession();

    feed(ANNOUNCE_AND_G1);
    // <g1> alone must not open a window — the mode is unknown until <12>.
    expect(openedWindows).toEqual([]);

    // The <12> arrives split across two WebSocket frames, the second one
    // preceded by a timeseal ack. Nothing may fire until the line completes.
    const split = 60;
    feed(S12_AFTER_E4.slice(0, split));
    expect(openedWindows).toEqual([]);
    expect(gameService.getLatestStyle12('95')).toBeUndefined();

    feed('[G]\u0000' + S12_AFTER_E4.slice(split) + '\n\rfics% ');
    expect(openedWindows).toEqual(['95']);
    expect(gameService.getMode('95')).toBe(BoardMode.OBSERVING);

    // The squares BoardWindow paints: position[rank][file], a1 = [0][0].
    const s12 = gameService.getLatestStyle12('95');
    expect(s12).toBeDefined();
    expect(s12!.position[3][4]).toBe(WP);    // e4 — the moved pawn
    expect(s12!.position[1][4]).toBe(EMPTY); // e2 — now vacated
    expect(s12!.position[0][4]).toBe(WK);    // e1
    expect(s12!.position[7][4]).toBe(BK);    // e8
    expect(s12!.whiteName).toBe('GuestFOO');
    expect(s12!.blackName).toBe('GuestBAR');
    expect(s12!.whiteRemainingTimeMillis).toBe(180000);
    expect(s12!.san).toBe('e4');
    expect(s12!.isWhiteOnTop).toBe(false);
  });

  it('parses a <12> glued to a buffered prompt, with no leading newline', () => {
    const { feed, chat, openedWindows, gameService } = makeSession();

    feed(ANNOUNCE_AND_G1);
    // The shape that used to be fatal: the previous block's `fics% ` prompt
    // is still buffered and the next block arrives without its leading
    // `\n\r`, so the parser is handed the single line `fics% <12> ...`. The
    // board froze while raw <12> text scrolled through chat.
    feed('fics% ' + S12_AFTER_E4 + '\n\r');

    expect(openedWindows).toEqual(['95']);
    expect(gameService.getMode('95')).toBe(BoardMode.OBSERVING);
    expect(gameService.getLatestStyle12('95')!.position[3][4]).toBe(WP); // e4
    // And the control line still never reaches chat.
    expect(chat.some(e => e.raw.includes('<12>'))).toBe(false);
  });

  it('highlights the castling king on the rank it actually stands on', () => {
    const { feed, gameService } = makeSession();

    feed(ANNOUNCE_AND_G1 + S12_AFTER_BLACK_CASTLES + '\n\rfics% ');
    const s12 = gameService.getLatestStyle12('95')!;

    // The grid says black castled: e8 empty, king on g8, rook on f8.
    expect(s12.position[7][4]).toBe(EMPTY);
    expect(s12.position[7][6]).toBe(BK);
    expect(s12.position[7][5]).toBe(BR);
    // ...and white's king has not moved.
    expect(s12.position[0][4]).toBe(WK);

    const last = lastMoveSquares(s12)!;
    expect(last).toEqual({ from: 'e8', to: 'g8', piece: 'K' });

    // The assertion that ties the highlight to the position it is drawn over:
    // whatever square the board lights up as the destination must be the one
    // holding the king that just moved. This failed before — `o-o` resolved
    // to e1→g1 for both colours, so a black castle lit up white's back rank,
    // where in this position the white king is still sitting.
    const to = parseSquare(last.to)!;
    expect(s12.position[to.rank][to.file]).toBe(BK);
  });

  it('updates the position on the next move without reopening the window', () => {
    const { feed, openedWindows, gameService } = makeSession();
    const stateChanges: Array<[string, boolean]> = [];
    gameService.addListener({
      gameStateChanged: (id, isNewMove) => stateChanges.push([id, isNewMove]),
    });

    feed(ANNOUNCE_AND_G1 + S12_AFTER_E4 + '\n\rfics% ');
    feed('\n\r' + S12_AFTER_C5 + '\n\rfics% ');

    expect(openedWindows).toEqual(['95']);
    expect(stateChanges).toEqual([
      ['95', true],
      ['95', true],
    ]);
    const s12 = gameService.getLatestStyle12('95');
    expect(s12!.position[4][2]).toBe(BP); // c5
    expect(s12!.position[6][2]).toBe(EMPTY); // c7
    expect(s12!.position[3][4]).toBe(WP); // e4 still there
    expect(s12!.fullMoveNumber).toBe(2);
    expect(s12!.whiteRemainingTimeMillis).toBe(178500);
  });

  it('lets no game-control line leak into chat during the session', () => {
    const { feed, chat } = makeSession();
    feed(ANNOUNCE_AND_G1);
    feed(S12_AFTER_E4.slice(0, 60));
    feed(S12_AFTER_E4.slice(60) + '\n\rfics% ');
    feed('\n\r' + S12_AFTER_C5 + '\n\rfics% ');

    for (const e of chat) {
      expect(e.raw).not.toContain('<12>');
      expect(e.raw).not.toContain('<g1>');
    }
    // The human-readable announcement DOES reach chat.
    expect(chat.some(e => e.raw.includes('Game 95: GuestFOO'))).toBe(true);
  });

  it('ends the observed game cleanly: mode-end fires and state is forgotten', () => {
    const { feed, gameService } = makeSession();
    const ended: string[] = [];
    gameService.addListener({
      onObsGameEnd: id => ended.push(id),
    });

    feed(ANNOUNCE_AND_G1 + S12_AFTER_E4 + '\n\rfics% ');
    feed('\n\r{Game 95 (GuestFOO vs. GuestBAR) GuestFOO resigns} 0-1\n\rfics% ');

    expect(ended).toEqual(['95']);
    expect(gameService.getLatestStyle12('95')).toBeUndefined();
    expect(gameService.getMode('95')).toBeUndefined();
  });
});
