import { describe, expect, it } from 'vitest';
import { pageAt, resolveForgeLayout } from './forgeLayout';

describe('Oefeningen in een training', () => {
  it('standaard een per scherm, iets geks telt als het advies', () => {
    expect(resolveForgeLayout(undefined)).toBe('scherm');
    expect(resolveForgeLayout({})).toBe('scherm');
    expect(resolveForgeLayout({ forgeLayout: 'lijst' })).toBe('lijst');
    expect(resolveForgeLayout({ forgeLayout: 'raar' })).toBe('scherm');
  });
  it('de pagina bij een scrollpositie', () => {
    expect(pageAt(0, 390, 5)).toBe(0);
    expect(pageAt(194, 390, 5)).toBe(0);
    expect(pageAt(196, 390, 5)).toBe(1);
    expect(pageAt(390 * 9, 390, 5)).toBe(4);
    expect(pageAt(100, 0, 5)).toBe(0);
    expect(pageAt(100, 390, 0)).toBe(0);
  });
});
