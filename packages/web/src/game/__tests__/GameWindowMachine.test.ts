import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ChatEventType,
  ChatService,
  makeChatEvent,
} from '@raptor3000/shared';
import {
  GameWindowMachine,
  type GameWindowMachineDeps,
} from '../GameWindowMachine.js';

/**
 * GameWindowMachine tests — the follow/observe attribution deduction.
 *
 * The machine's only real dependency is the ChatService (FOLLOWING /
 * NOT_FOLLOWING events) plus an injected hidden-send, so these tests
 * drive it directly: commands through onUserCommand, confirmations
 * through chatService.publish, and Style12 arrivals through
 * classifyObservedGame. The connector, WindowManager and GameManager
 * wiring are covered where they live.
 */

function makeMachine(): { chatService: ChatService; machine: GameWindowMachine; sent: string[] } {
  const chatService = new ChatService();
  const sent: string[] = [];
  const machine = new GameWindowMachine({
    chatService,
    sendHidden: line => sent.push(line),
  } satisfies GameWindowMachineDeps);
  return { chatService, machine, sent };
}

function feedFollow(chatService: ChatService, source: string): void {
  chatService.publish(
    makeChatEvent(ChatEventType.FOLLOWING, `You will now be following ${source}'s games.`, {
      source,
    }),
  );
}

function feedNotFollowing(chatService: ChatService): void {
  chatService.publish(
    makeChatEvent(ChatEventType.NOT_FOLLOWING, "You will not follow any player's games."),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('following by handle', () => {
  it('follows a player and claims their game by name', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');

    expect(machine.following).toBe(true);
    expect(machine.followKind).toEqual({ type: 'handle', handle: 'billjr' });
    expect(machine.classifyObservedGame('77', 'GuestFoo', 'billjr')).toBe('follow');
    expect(machine.currentFollowGame).toBe('77');
    expect(machine.followLabelFor('77')).toBe('(follow billjr)');
  });

  it('matches the name case-insensitively and preserves the typed label', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow BillJr');
    feedFollow(chatService, 'BillJr');

    expect(machine.classifyObservedGame('77', 'BILLJR', 'GuestFoo')).toBe('follow');
    expect(machine.followLabelFor('77')).toBe('(follow BillJr)');
  });

  it('does not claim a game neither player is in', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');

    expect(machine.classifyObservedGame('77', 'GuestFoo', 'GuestBar')).toBe('manual');
    expect(machine.currentFollowGame).toBeNull();
    expect(machine.followLabelFor('77')).toBeNull();
  });

  it('names the kind from the FOLLOWING event when no command was seen', () => {
    const { chatService, machine } = makeMachine();

    feedFollow(chatService, 'pindik');

    expect(machine.followKind).toEqual({ type: 'handle', handle: 'pindik' });
    expect(machine.classifyObservedGame('5', 'pindik', 'GuestA')).toBe('follow');
    expect(machine.followLabelFor('5')).toBe('(follow pindik)');
  });
});

describe('following the best game', () => {
  it('follows /b and labels the window by the sent flag', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow /b');
    // FICS reports every best-flag follow as "strongest player's games."
    feedFollow(chatService, 'strongest');

    expect(machine.followKind).toEqual({ type: 'best', flag: '/b' });
    // No name to match on: any unrequested arrival is the follow game.
    expect(machine.classifyObservedGame('77', 'GuestFoo', 'GuestBar')).toBe('follow');
    expect(machine.followLabelFor('77')).toBe('(follow best blitz)');
  });

  it('labels lightning and standard by their flags', () => {
    const { machine } = makeMachine();

    machine.onUserCommand('follow /l');
    machine.classifyObservedGame('1', 'a', 'b');
    expect(machine.followLabelFor('1')).toBe('(follow best lightning)');

    machine.onUserCommand('follow /s');
    machine.classifyObservedGame('2', 'a', 'b');
    expect(machine.followLabelFor('2')).toBe('(follow best standard)');
  });

  it('shows a generic label when the flag is unknown (best by hand)', () => {
    const { chatService, machine } = makeMachine();

    feedFollow(chatService, 'strongest');
    machine.classifyObservedGame('77', 'a', 'b');

    expect(machine.followKind).toEqual({ type: 'best', flag: null });
    expect(machine.followLabelFor('77')).toBe('(follow best)');
  });
});

describe('attribution: a user observe is never stolen by a follow claim', () => {
  it('an exact observe wins over a name-matching follow', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    machine.onUserCommand('observe 45');

    // The game the user named, even though billjr is in it.
    expect(machine.classifyObservedGame('45', 'billjr', 'GuestX')).toBe('manual');
    expect(machine.currentFollowGame).toBeNull();
    // The marker is spent; billjr's next game is free to be the follow.
    expect(machine.classifyObservedGame('77', 'billjr', 'GuestY')).toBe('follow');
  });

  it('accepts the obs abbreviation', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    machine.onUserCommand('obs 45');

    expect(machine.classifyObservedGame('45', 'billjr', 'x')).toBe('manual');
  });

  it('a fresh best-observe claims the arrival as its result', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow /b');
    feedFollow(chatService, 'strongest');
    machine.onUserCommand('observe /b');

    expect(machine.classifyObservedGame('30', 'GuestA', 'GuestB')).toBe('manual');
    expect(machine.currentFollowGame).toBeNull();
  });

  it('a stale best-observe expires and cannot swallow the follow game', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow /b');
    feedFollow(chatService, 'strongest');
    machine.onUserCommand('observe /b');
    // FICS answered a failing best-observe with plain text, so no Style12
    // consumed the marker; after the timeout it must not eat the follow.
    vi.advanceTimersByTime(6000);

    expect(machine.classifyObservedGame('77', 'GuestA', 'GuestB')).toBe('follow');
    expect(machine.followLabelFor('77')).toBe('(follow best blitz)');
  });

  it('an unknown observe argument parks no marker', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow /b');
    feedFollow(chatService, 'strongest');
    machine.onUserCommand('observe potato');

    expect(machine.classifyObservedGame('77', 'a', 'b')).toBe('follow');
  });
});

describe('follow lifecycle', () => {
  it('a game end returns to awaiting, still following', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow /b');
    feedFollow(chatService, 'strongest');
    machine.classifyObservedGame('77', 'a', 'b');
    machine.onFollowGameEnd('77');

    expect(machine.currentFollowGame).toBeNull();
    expect(machine.following).toBe(true);
    expect(machine.followLabelFor('77')).toBeNull();
    expect(machine.classifyObservedGame('78', 'c', 'd')).toBe('follow');
  });

  it('a re-follow replaces the subscription and drops the old claim', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    machine.classifyObservedGame('77', 'billjr', 'x');
    expect(machine.followLabelFor('77')).toBe('(follow billjr)');

    machine.onUserCommand('follow /b');
    feedFollow(chatService, 'strongest');

    expect(machine.followKind).toEqual({ type: 'best', flag: '/b' });
    expect(machine.currentFollowGame).toBeNull();
    expect(machine.followLabelFor('77')).toBeNull();
    machine.classifyObservedGame('88', 'a', 'b');
    expect(machine.followLabelFor('88')).toBe('(follow best blitz)');
  });

  it('bare follow is FICS\'s off switch', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    machine.onUserCommand('follow');

    expect(machine.following).toBe(false);
    expect(machine.followKind).toBeNull();
  });

  it('the NOT_FOLLOWING event clears the subscription', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    feedNotFollowing(chatService);

    expect(machine.following).toBe(false);
  });

  it('closing the follow window sends the off switch and clears state', () => {
    const { chatService, machine, sent } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    machine.classifyObservedGame('77', 'billjr', 'x');

    machine.onFollowWindowClosed();

    expect(sent).toEqual(['follow']);
    expect(machine.following).toBe(false);
    expect(machine.currentFollowGame).toBeNull();
  });

  it('closing the follow window while idle sends nothing', () => {
    const { machine, sent } = makeMachine();

    machine.onFollowWindowClosed();

    expect(sent).toEqual([]);
  });

  it('isFollowGame reports the claimed game only', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    feedFollow(chatService, 'billjr');
    machine.classifyObservedGame('77', 'billjr', 'x');

    expect(machine.isFollowGame('77')).toBe(true);
    expect(machine.isFollowGame('78')).toBe(false);
  });

  it('dispose removes the chat listener', () => {
    const { chatService, machine } = makeMachine();

    machine.onUserCommand('follow billjr');
    machine.dispose();
    feedNotFollowing(chatService);

    expect(machine.following).toBe(true);
  });
});
