import { describe, expect, it } from 'vitest';
import { resolveMotion } from './motionSettings';

describe('resolveMotion', () => {
  it('zonder keuze geldt Normaal', () => {
    expect(resolveMotion(undefined)).toBe('full');
    expect(resolveMotion({})).toBe('full');
  });

  it('kent Rustig en Uit en negeert onzin', () => {
    expect(resolveMotion({ motion: 'calm' })).toBe('calm');
    expect(resolveMotion({ motion: 'off' })).toBe('off');
    expect(resolveMotion({ motion: 'veel' })).toBe('full');
    expect(resolveMotion({ motion: 3 })).toBe('full');
  });

  it('beperkte beweging van het systeem gaat altijd voor', () => {
    expect(resolveMotion({ motion: 'full' }, true)).toBe('off');
    expect(resolveMotion(undefined, true)).toBe('off');
  });
});
