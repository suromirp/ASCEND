import { describe, expect, it } from 'vitest';
import { pad } from './pad';

describe('pad', () => {
  it('zet een nul voor een enkel cijfer', () => {
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
  });
  it('laat twee cijfers staan', () => {
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
  });
  it('knipt een langer getal niet af', () => {
    expect(pad(123)).toBe('123');
  });
});
