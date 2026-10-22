import { afterEach, describe, expect, it } from 'vitest';
import { noteOverlayClosed, OVERLAY_TAP_GUARD_MS, resetOverlayGuard, tapFollowsOverlayClose } from './overlayGuard';

describe('overlayGuard', () => {
  afterEach(() => resetOverlayGuard());

  it('laat tikken door als er nooit een blad dicht is gegaan', () => {
    expect(tapFollowsOverlayClose(1_000_000)).toBe(false);
  });

  it('negeert een tik vlak na het sluiten van een blad', () => {
    noteOverlayClosed(10_000);
    expect(tapFollowsOverlayClose(10_050)).toBe(true);
    expect(tapFollowsOverlayClose(10_000 + OVERLAY_TAP_GUARD_MS - 1)).toBe(true);
  });

  it('laat een bewuste tik daarna weer door', () => {
    noteOverlayClosed(10_000);
    expect(tapFollowsOverlayClose(10_000 + OVERLAY_TAP_GUARD_MS)).toBe(false);
    expect(tapFollowsOverlayClose(20_000)).toBe(false);
  });
});
