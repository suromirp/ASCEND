// Warden, proeftests bij I-61: het midden van de kaart zonder lus en de stand van de vraag. Nagemaakte punten.
import { describe, expect, it } from 'vitest';
import { askMapCenter, maySearch, planStart, startView } from './routeStart';

const rough = { lat: 52.123456, lon: 5.654321 };
const home = { lat: 48.11111, lon: 11.22222 };
const town = { lat: 52.3791, lon: 4.9003 };

describe('het midden van de kaart zonder lus', () => {
  it('de grove plek van het toestel op drie decimalen, nooit scherper', () => {
    expect(askMapCenter({ rough, home, town })).toMatchObject({ kind: 'device', point: { lat: 52.123, lon: 5.654 } });
  });
  it('je plaats voor het weer op twee decimalen', () => {
    expect(askMapCenter({ town })).toMatchObject({ kind: 'town', point: { lat: 52.38, lon: 4.9 } });
  });
  it('een kapotte grove plek of een kapot Thuis valt door naar de volgende', () => {
    expect(askMapCenter({ rough: { lat: 'x' }, home: { lat: 999, lon: 0 }, town }).kind).toBe('town');
    expect(askMapCenter({}).kind).toBe('overview');
  });
});

describe('de vraag blijft een vraag, wat het midden ook is', () => {
  for (const reason of ['denied', 'approximate', 'coarse', 'timeout', 'unavailable', 'unsupported'] as const) {
    it(`${reason}: geen punt in het plan, niet klaar om te zoeken, ook met Thuis en instelling Thuis`, () => {
      for (const mode of ['here', 'exact'] as const) {
        const plan = planStart({ mode, home, picked: 'here', found: { ok: false, reason } });
        expect(plan.kind).toBe('ask');
        expect('point' in plan).toBe(false);
        const view = startView(plan);
        expect(view.ready).toBe(false);
        expect(maySearch({ closing: false, enabled: true, asked: true, ready: view.ready, searchNeeded: true, hasPlace: true })).toBe(false);
      }
    });
  }
  it('bij Ongeveer komt de vraag niet voor, ook niet na een mislukte plek', () => {
    expect(planStart({ mode: 'approx', home, picked: 'here', found: { ok: false, reason: 'coarse' } }).kind).toBe('approx');
  });
});
