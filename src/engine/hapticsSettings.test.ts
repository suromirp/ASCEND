import { describe, expect, it } from 'vitest';
import { resolveHaptics } from './hapticsSettings';

describe('resolveHaptics', () => {
  it('staat standaard aan', () => {
    expect(resolveHaptics(undefined)).toBe(true);
    expect(resolveHaptics({})).toBe(true);
  });
  it('zet alleen een echte false uit', () => {
    expect(resolveHaptics({ haptics: false })).toBe(false);
    expect(resolveHaptics({ haptics: true })).toBe(true);
    expect(resolveHaptics({ haptics: 'nee' })).toBe(true);
    expect(resolveHaptics({ haptics: 0 })).toBe(true);
  });
});
