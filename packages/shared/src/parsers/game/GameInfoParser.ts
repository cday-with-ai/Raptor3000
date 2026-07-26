import type { ChunkParser } from '../FicsParser.js';
import {
  GameInfoCategory,
  type GameInfo,
  type GameInfoCategoryCode,
} from '../../models/GameInfo.js';

/**
 * `games` command output. Direct port of Raptor's
 * `GameInfoParser.java` (BSD) — same character-by-character state
 * machine, same branches for `(Exam.` / `(Setup)` / regular rows.
 *
 * Two row formats handled:
 *
 *   158 2007 ventroy   1967 chelou       [ lr  1   0]   0:42 -  0:41 (17-20) W: 20
 *    5 (Exam.    0 LectureBot   0 A.Zaitzev  ) [ uu  0   0] W: 20
 *
 * Terminated by `"games displayed."` — without that trailer the block
 * isn't a games-list.
 */
export class GameInfoParser implements ChunkParser<GameInfo[]> {
  readonly name = 'GameInfoParser';
  static readonly END = 'games displayed.';

  parse(message: string): GameInfo[] | null {
    if (!message.endsWith(GameInfoParser.END)) return null;
    const trimmed = message.trim();
    if (trimmed.indexOf(' ') === -1) return null;

    const out: GameInfo[] = [];
    for (const line of trimmed.split('\n')) {
      try {
        const info = parseGameLine(line);
        if (info) out.push(info);
      } catch (e) {
        if (e === END_OF_LIST) break;
        throw e;
      }
    }
    return out;
  }
}

const END_OF_LIST = Symbol('END_OF_LIST');

/** Mutable accumulator that becomes a frozen GameInfo when returned. */
interface Acc {
  id: string;
  whiteName: string;
  blackName: string;
  whiteElo: string;
  blackElo: string;
  time: number;
  inc: number;
  category: GameInfoCategoryCode;
  isPrivate: boolean;
  isRated: boolean;
  beingExamined: boolean;
  whitesMove: boolean;
  moveNumber: number;
}

function emptyAcc(): Acc {
  return {
    id: '',
    whiteName: '',
    blackName: '',
    whiteElo: '',
    blackElo: '',
    time: 0,
    inc: 0,
    category: GameInfoCategory.NONSTANDARD,
    isPrivate: false,
    isRated: false,
    beingExamined: false,
    whitesMove: true,
    moveNumber: 0,
  };
}

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function parseGameLine(line: string): GameInfo | null {
  const len = line.length;
  if (len === 0) return null;
  if (line.endsWith(GameInfoParser.END)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw END_OF_LIST;
  }

  let i = 0;
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Game id
  let j = i;
  let sb = '';
  while (j < len && isDigit(line.charAt(j))) {
    sb += line.charAt(j);
    j++;
  }
  if (j >= len) return null;
  if (i === j) return null;

  const info = emptyAcc();
  info.id = sb;
  i = j;
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  if (line.charAt(i) === '(') {
    return parseExamGame(line, len, i + 1, info);
  }
  return parseRegularGame(line, len, i, info);
}

function parseExamGame(
  line: string,
  len: number,
  iArg: number,
  info: Acc,
): GameInfo | null {
  let i = iArg;
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i + 5 >= len) return null;
  if (line.substring(i, i + 5) !== 'Exam.') return null;
  i += 5;
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  let sb = '';

  // Rating player white
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.whiteElo = sb; sb = '';
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Name player white
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.whiteName = sb; sb = '';
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Rating player black
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.blackElo = sb; sb = '';
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Name player black. Raptor quirk: if the name token ends with `)`
  // there was no whitespace separator — strip the paren, rewind one.
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (line.charAt(i - 1) === ')') {
    info.blackName = sb.substring(0, sb.length - 1);
    i--;
  } else {
    info.blackName = sb;
  }
  sb = '';
  if (i >= len) return null;

  while (i < len && line.charAt(i) !== ')') i++;
  info.beingExamined = true;

  const afterFlags = parseFlagsAndTimes(line, len, i + 1, info);
  if (afterFlags < 0) return null;
  i = afterFlags;

  info.whitesMove = line.charAt(i) === 'W';
  i++;
  while (i < len && (isWhitespace(line.charAt(i)) || line.charAt(i) === ':')) i++;
  if (i >= len) return null;

  while (i < len && isDigit(line.charAt(i))) { sb += line.charAt(i); i++; }
  info.moveNumber = parseInt(sb, 10);
  return freeze(info);
}

function parseRegularGame(
  line: string,
  len: number,
  iArg: number,
  info: Acc,
): GameInfo | null {
  let i = iArg;
  let sb = '';

  // Rating player white
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.whiteElo = sb; sb = '';
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Name player white
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.whiteName = sb; sb = '';
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Rating player black
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.blackElo = sb; sb = '';
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return null;

  // Name player black
  while (i < len && !isWhitespace(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return null;
  info.blackName = sb; sb = '';
  info.beingExamined = false;

  const afterFlags = parseFlagsAndTimes(line, len, i, info);
  if (afterFlags < 0) return null;
  i = afterFlags;

  while (i < len && line.charAt(i) !== 'W' && line.charAt(i) !== 'B') i++;
  if (i >= len) return null;
  info.whitesMove = line.charAt(i) === 'W';
  i++;
  while (i < len && (isWhitespace(line.charAt(i)) || line.charAt(i) === ':')) i++;
  if (i >= len) return null;

  while (i < len && isDigit(line.charAt(i))) { sb += line.charAt(i); i++; }
  info.moveNumber = parseInt(sb, 10);
  return freeze(info);
}

function parseFlagsAndTimes(
  line: string,
  len: number,
  iArg: number,
  info: Acc,
): number {
  let i = iArg;
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return -1;
  if (line.charAt(i) !== '[') return -1;
  i++;
  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return -1;

  let sb = '';
  while (i < len && !isWhitespace(line.charAt(i)) && !isDigit(line.charAt(i))) {
    sb += line.charAt(i); i++;
  }
  if (i >= len) return -1;
  applyFlags(sb, info);
  sb = '';

  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return -1;
  while (i < len && isDigit(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return -1;
  info.time = parseInt(sb, 10); sb = '';

  while (i < len && isWhitespace(line.charAt(i))) i++;
  if (i >= len) return -1;
  while (i < len && isDigit(line.charAt(i))) { sb += line.charAt(i); i++; }
  if (i >= len) return -1;
  info.inc = parseInt(sb, 10);

  while (i < len && (isWhitespace(line.charAt(i)) || line.charAt(i) === ']')) i++;
  if (i >= len) return -1;
  return i;
}

function applyFlags(flags: string, info: Acc): void {
  let rest = flags;
  if (rest.startsWith('p')) {
    info.isPrivate = true;
    rest = rest.substring(1);
  }
  switch (rest.charAt(0)) {
    case 'b': info.category = GameInfoCategory.BLITZ; break;
    case 'l': info.category = GameInfoCategory.LIGHTNING; break;
    case 'u': info.category = GameInfoCategory.UNTIMED; break;
    case 'e': info.category = GameInfoCategory.EXAMINED; break;
    case 's': info.category = GameInfoCategory.STANDARD; break;
    case 'w': info.category = GameInfoCategory.WILD; break;
    case 'x': info.category = GameInfoCategory.ATOMIC; break;
    case 'z': info.category = GameInfoCategory.CRAZYHOUSE; break;
    case 'B': info.category = GameInfoCategory.BUGHOUSE; break;
    case 'L': info.category = GameInfoCategory.LOSERS; break;
    case 'S': info.category = GameInfoCategory.SUICIDE; break;
    case 'n': info.category = GameInfoCategory.NONSTANDARD; break;
    default:  info.category = GameInfoCategory.NONSTANDARD; break;
  }
  switch (rest.charAt(1)) {
    case 'r': info.isRated = true; break;
    case 'u': info.isRated = false; break;
    default:  info.isRated = false; break;
  }
}

function freeze(a: Acc): GameInfo {
  return a;
}
