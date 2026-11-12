import { describe, expect, it } from 'vitest';
import { keyStep, nearestIndex, scrubIntent, yFraction } from './standChart';

describe('het label loopt mee: de keuzes van de grafieken op Je stand', () => {
  it('de stip onder je vinger is de dichtstbijzijnde, ook voor de eerste en voorbij de laatste', () => {
    const xs = [0, 0.25, 0.5, 0.75, 1];
    expect(nearestIndex(xs, 0.3)).toBe(1);
    expect(nearestIndex(xs, 0.62)).toBe(2);
    expect(nearestIndex(xs, -0.4)).toBe(0);
    expect(nearestIndex(xs, 1.7)).toBe(4);
    expect(nearestIndex([0.5], 0.9)).toBe(0);
  });

  it('opzij is schuiven, op en neer blijft scrollen, een kleine beweging is nog niets', () => {
    expect(scrubIntent(3, 2)).toBeUndefined();
    expect(scrubIntent(12, 4)).toBe('scrub');
    expect(scrubIntent(-12, 4)).toBe('scrub');
    expect(scrubIntent(4, 14)).toBe('scroll');
    expect(scrubIntent(10, -11)).toBe('scroll');
  });

  it('met het toetsenbord: pijltjes langs de stippen, Home en End, Escape terug naar vandaag', () => {
    expect(keyStep(3, 3, 7, 'ArrowLeft')).toBe(2);
    expect(keyStep(3, 3, 7, 'ArrowRight')).toBe(4);
    expect(keyStep(0, 3, 7, 'ArrowLeft')).toBe(0);
    expect(keyStep(6, 3, 7, 'ArrowRight')).toBe(6);
    expect(keyStep(5, 3, 7, 'Home')).toBe(0);
    expect(keyStep(1, 3, 7, 'End')).toBe(6);
    expect(keyStep(1, 3, 7, 'Escape')).toBe(3);
    expect(keyStep(1, 3, 7, 'a')).toBeUndefined();
    expect(keyStep(0, 0, 0, 'ArrowLeft')).toBeUndefined();
  });

  it('frisser boven: bij Frisheid staat de lage index boven, bij belasting de hoge waarde', () => {
    expect(yFraction(0, 0, 20, 'low')).toBe(0);
    expect(yFraction(20, 0, 20, 'low')).toBe(1);
    expect(yFraction(5, 0, 20, 'low')).toBeLessThan(yFraction(15, 0, 20, 'low'));
    expect(yFraction(500, 0, 1000, 'high')).toBe(0.5);
    expect(yFraction(1000, 0, 1000, 'high')).toBe(0);
    // Buiten het bereik blijft het binnen de grafiek.
    expect(yFraction(40, 0, 20, 'low')).toBe(1);
  });
});
