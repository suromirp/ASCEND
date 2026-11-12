// Je plekken in Instellingen: volgorde, waarde in de rij, de vraag bij Wissen en een nieuwe naam. Nagemaakte plekken.
import { describe, expect, it } from 'vitest';
import { cleanPlaceName, placesInOrder, wipeQuestion } from './placesPage';
import type { Place } from '../models/place';

const p = (id: string, createdAt: string, home = false): Place => ({ id, name: `Plek ${id}`, lat: 52, lon: 5, source: 'search', createdAt, ...(home ? { home: true as const } : {}) });

describe('Je plekken', () => {
  it('Thuis bovenaan, daarna de recentste', () => {
    expect(placesInOrder([p('a', '2026-11-01'), p('h', '2026-10-01', true), p('c', '2026-11-09'), p('b', '2026-11-09')]).map((x) => x.id)).toEqual(['h', 'b', 'c', 'a']);
  });
  it('de vraag bij Wissen noemt de routes; bij Thuis waar de lus daarna begint', () => {
    expect(wipeQuestion(p('a', '2026-11-01'), [])).toBe('Plek a wissen? Je trainingen blijven staan.');
    expect(wipeQuestion(p('a', '2026-11-01'), [{ placeId: 'a' }, { placeId: 'b' }])).toBe('Plek a en de route erbij wissen? Je trainingen blijven staan.');
    expect(wipeQuestion({ id: 'h', name: 'Thuis', home: true }, [{ placeId: 'h' }, { placeId: 'h' }])).toBe('Thuis en de 2 routes erbij wissen? Je trainingen blijven staan. Je lus begint daarna waar je nu bent, tot je een nieuw Thuis kiest.');
  });
  it('een nieuwe naam: leeg telt niet, hoogstens 40 tekens', () => {
    expect(cleanPlaceName('   ')).toBeUndefined();
    expect(cleanPlaceName('  Bos   aan de  rand ')).toBe('Bos aan de rand');
    expect(cleanPlaceName('x'.repeat(60))?.length).toBe(40);
  });
  it('geen gedachtestreepjes', () => {
    expect(wipeQuestion({ id: 'h', name: 'Thuis', home: true }, [])).not.toMatch(/[–—]/);
  });
});
