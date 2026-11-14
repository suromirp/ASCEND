import { describe, expect, it, vi } from 'vitest';
import { rotationCounter } from './deviceShell';

// Groter mag liggend; daarna staat de app weer rechtop (besluit 2026-11-14-route-kaart-vervolg.md).
describe('draaien alleen op de vergrote kaart', () => {
  it('openen laat draaien; sluiten zet de app weer rechtop, ook als de telefoon nog liggend is', () => {
    const free = vi.fn();
    const portrait = vi.fn();
    const allow = rotationCounter(free, portrait);
    const release = allow();
    expect(free).toHaveBeenCalledTimes(1);
    expect(portrait).not.toHaveBeenCalled();
    release();
    expect(portrait).toHaveBeenCalledTimes(1);
  });

  it('twee keer loslaten (terugknop en sluiten in hetzelfde moment) telt één keer', () => {
    const portrait = vi.fn();
    const allow = rotationCounter(() => undefined, portrait);
    const release = allow();
    release();
    release();
    expect(portrait).toHaveBeenCalledTimes(1);
  });

  it('pas als het laatste scherm dichtgaat, staat de app weer rechtop', () => {
    const free = vi.fn();
    const portrait = vi.fn();
    const allow = rotationCounter(free, portrait);
    const a = allow();
    const b = allow();
    expect(free).toHaveBeenCalledTimes(1);
    a();
    expect(portrait).not.toHaveBeenCalled();
    b();
    expect(portrait).toHaveBeenCalledTimes(1);
    // Daarna opnieuw openen werkt weer.
    allow();
    expect(free).toHaveBeenCalledTimes(2);
  });
});
