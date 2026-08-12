/**
 * Mobile/tablet detection (Carson, 2026-08-12): Raptor3000 is a
 * WINDOWED desktop app — chat and boards are real window.open popups.
 * On phones and tablets those become browser tabs at best and get
 * popup-blocked at worst (a board auto-opening off a socket event is
 * exactly what mobile blockers exist to stop). Rather than a broken
 * half-experience, the login screen says so plainly.
 *
 * The check: a coarse primary pointer AND a small screen. A touch
 * laptop fails the size test, a desktop touchscreen monitor fails
 * neither and is fine anyway — false negatives here are harmless, the
 * banner is a note, not a gate.
 */
export interface MobileProbe {
  coarsePointer: boolean;
  shortSide: number;
}

export function probeEnvironment(): MobileProbe {
  return {
    coarsePointer:
      typeof matchMedia !== 'undefined' &&
      matchMedia('(pointer: coarse)').matches,
    shortSide:
      typeof screen !== 'undefined'
        ? Math.min(screen.width, screen.height)
        : Infinity,
  };
}

export function isMobileish(probe: MobileProbe = probeEnvironment()): boolean {
  return probe.coarsePointer && probe.shortSide < 900;
}
