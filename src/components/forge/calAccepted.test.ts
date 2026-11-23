import { describe, expect, it } from 'vitest';
import { calAcceptedOf } from './forgeDraft';

const noRows = { exercises: [{ rows: [{ id: 'a:1' }] }] } as never;
const withCal = { exercises: [{ rows: [{ id: 'a:aijk' }] }] } as never;

describe('calAcceptedOf', () => {
  it('leest het bewaarde Akkoord ook als Lichter de ijkset uit de rijen haalde', () => {
    expect(calAcceptedOf({ ...(noRows as object), calAccepted: true } as never)).toBe(true);
  });
  it('valt voor een concept zonder veld terug op de rijen', () => {
    expect(calAcceptedOf(noRows)).toBe(false);
    expect(calAcceptedOf(withCal)).toBe(true);
    expect(calAcceptedOf(undefined)).toBe(false);
  });
  it('een ijkset in de rijen telt altijd als aangenomen', () => {
    expect(calAcceptedOf({ ...(withCal as object), calAccepted: false } as never)).toBe(true);
  });
});
