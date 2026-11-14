// Start bij in vaste chips (besluit 2026-11-14-geen-stille-thuis.md): Waar je nu bent, Thuis als die er
// is, en Andere plek. Nagemaakte plekken en namen.
import { describe, expect, it } from 'vitest';
import type { Place } from '../models/place';
import { savedStartChips, startChipKey, startChoices, startTrio } from './places';

const home: Place = { id: 'place_home', name: 'Thuis', lat: 50, lon: 4, home: true, source: 'fixed-point', createdAt: '2026-11-01' };
const ridge: Place = { id: 'p_ridge', name: 'Heuvelkam Oost met een lange naam', lat: 50.2, lon: 4.3, source: 'search', createdAt: '2026-11-05' };
const lake: Place = { id: 'p_lake', name: 'Meerpad', lat: 50.1, lon: 4.1, source: 'map', createdAt: '2026-11-03' };

const trioFor = (setting: 'here' | 'exact' | 'approx', places: Place[], picked?: string, otherLabel?: string) => {
  const choices = startChoices(setting, places, undefined, picked, otherLabel);
  return startTrio(choices.chips, startChipKey(choices.chosen));
};

describe('startTrio: vaste chips met vaste namen', () => {
  it('standaard: Waar je nu bent gekozen; Thuis als chip als die er is; Andere plek niet gekozen', () => {
    const trio = trioFor('here', [home, ridge]);
    expect(trio.hereChosen).toBe(true);
    expect(trio.home?.chosen).toBe(false);
    expect(trio.other).toEqual({ chosen: false });
  });
  it('de instelling Thuis: de chip Thuis staat gekozen, de andere chips houden hun naam', () => {
    const trio = trioFor('exact', [home, ridge]);
    expect(trio.hereChosen).toBe(false);
    expect(trio.home?.chosen).toBe(true);
    expect(trio.other.chosen).toBe(false);
  });
  it('geen Thuis bewaard: geen chip Thuis', () => {
    const trio = trioFor('exact', []);
    expect(trio.hereChosen).toBe(true);
    expect(trio.home).toBeUndefined();
  });
  it('een gekozen bewaarde plek: Andere plek gekozen, met de naam voor de regel eronder', () => {
    expect(trioFor('here', [home, ridge, lake], 'p_lake').other).toEqual({ chosen: true, name: 'Meerpad' });
  });
  it('een gezochte plek die nog niet bewaard is: Andere plek gekozen, met haar naam', () => {
    expect(trioFor('here', [home], 'other', 'Dorp aan de rivier').other).toEqual({ chosen: true, name: 'Dorp aan de rivier' });
  });
  it('Ongeveer valt onder Waar je nu bent; een onbekende sleutel ook', () => {
    expect(trioFor('approx', [home]).hereChosen).toBe(true);
    expect(startTrio([{ kind: 'here', label: 'Waar je nu bent' }], 'weg').hereChosen).toBe(true);
  });
});

describe('savedStartChips', () => {
  it('Thuis bovenaan, dan de rest met de recentste eerst; alle plekken, niet hoogstens vier', () => {
    const many = Array.from({ length: 5 }, (_, i): Place => ({ id: `p${i}`, name: `Plek ${i}`, lat: 50, lon: 4 + i / 100, source: 'search', createdAt: `2026-11-0${i + 1}` }));
    const chips = savedStartChips([...many, home]);
    expect(chips.map((c) => c.label)).toEqual(['Thuis', 'Plek 4', 'Plek 3', 'Plek 2', 'Plek 1', 'Plek 0']);
    expect(chips[0]).toEqual({ kind: 'home', label: 'Thuis', placeId: 'place_home' });
  });
  it('geen Thuis bewaard: alleen je plekken; geen plekken: leeg', () => {
    expect(savedStartChips([lake, ridge]).map((c) => c.label)).toEqual(['Heuvelkam Oost met een lange naam', 'Meerpad']);
    expect(savedStartChips([])).toEqual([]);
  });
});
