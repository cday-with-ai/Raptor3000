import { describe, it, expect } from 'vitest';
import { isMobileDemo, isMobileish, shouldBlockMobile } from '../mobile.js';

/**
 * The mobile note (2026-08-12): coarse pointer + small screen = the
 * login screen warns that this is a windowed desktop app. Chosen over a
 * single-window mode after the cost check — popups-as-tabs plus mobile
 * popup blockers make the real fix a rework, not a control.
 */
describe('isMobileDemo', () => {
  // ?mobile=demo shows the desktop-only stop from a desktop for
  // eyeballing; matches exactly, like the popup gate's demo param.
  it('matches exactly mobile=demo', () => {
    expect(isMobileDemo('?mobile=demo')).toBe(true);
    expect(isMobileDemo('?window=chat&mobile=demo')).toBe(true);
    expect(isMobileDemo('')).toBe(false);
    expect(isMobileDemo('?mobile=1')).toBe(false);
  });
});

describe('isMobileish', () => {
  it('flags a phone: coarse pointer, small short side', () => {
    expect(isMobileish({ coarsePointer: true, shortSide: 390 })).toBe(true);
  });

  it('flags a tablet in either orientation', () => {
    expect(isMobileish({ coarsePointer: true, shortSide: 820 })).toBe(true);
  });

  it('passes a desktop: fine pointer, any size', () => {
    expect(isMobileish({ coarsePointer: false, shortSide: 390 })).toBe(false);
    expect(isMobileish({ coarsePointer: false, shortSide: 1440 })).toBe(false);
  });

  it('passes a touch laptop / desktop touchscreen: big short side', () => {
    expect(isMobileish({ coarsePointer: true, shortSide: 1080 })).toBe(false);
  });

  it('node environment (no matchMedia/screen) is not mobile', () => {
    expect(isMobileish()).toBe(false);
  });
});

describe('shouldBlockMobile (desktop-only, 2026-08-13)', () => {
  const phone = { coarsePointer: true, shortSide: 390 };
  it('blocks phones outright', () => {
    expect(shouldBlockMobile(phone, false)).toBe(true);
  });
  it('the try-anyway override opens the gate', () => {
    expect(shouldBlockMobile(phone, true)).toBe(false);
  });
  it('desktops never see the stop', () => {
    expect(shouldBlockMobile({ coarsePointer: false, shortSide: 390 }, false)).toBe(false);
  });
});
