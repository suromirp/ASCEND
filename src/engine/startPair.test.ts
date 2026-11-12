// Start bij in twee chips (besluit 2026-11-12-route-blok.md): Waar je nu bent en een tweede chip met de
// naam van de plek die geldt. Nagemaakte plekken en namen.
import { describe, expect, it } from 'vitest';
import type { Place } from '../models/place';
import { OTHER_PLACE_LABEL, savedStartChips, startChipKey, startChoices, startPair } from './places';

const home: Place = { id: 'place_home', name: 'Thuis', lat: 50, lon: 4, home: true, source: 'fixed-point', createdAt: '2026-11-01' };
const ridge: Place = { id: 'p_ridge', name: 'Heuvelkam Oost met een lange naam', lat: 50.2, lon: 4.3, source: 'search', createdAt: '2026-11-05' };
const lake: Place = { id: 'p_lake', name: 'Meerpad', lat: 50.1, lon: 4.1, source: 'map', createdAt: '2026-11-03' };

const pairFor = (setting: 'here' | 'exact' | 'approx', places: Place[], picked?: string, otherLabel?: string) => {
  const choices = startChoices(setting, places, undefined, picked, otherLabel);
  return startPair(choices.chips, startChipKey(choices.chosen));
};

describe('startPair', () => {
  it('standaard: Waar je nu bent gekozen, de tweede chip heet Andere plek', () => {
    const pair = pairFor('here', [home, ridge]);
    expect(pair.hereChosen).toBe(true);
    expect(pair.other).toEqual({ label: OTHER_PLACE_LABEL, chosen: false, aria: OTHER_PLACE_LABEL });
  });
  it('een oude instelling die bij Thuis start: Thuis staat gekozen als naam op de tweede chip', () => {
    const pair = pairFor('exact', [home, ridge]);
    expect(pair.hereChosen).toBe(false);
    expect(pair.other).toEqual({ label: 'Thuis', chosen: true, aria: 'Andere plek: Thuis' });
  });
  it('instelling Thuis maar geen Thuis bewaard: Waar je nu bent, en de tweede chip blijft Andere plek', () => {
    const pair = pairFor('exact', []);
    expect(pair.hereChosen).toBe(true);
    expect(pair.other.label).toBe(OTHER_PLACE_LABEL);
  });
  it('een gekozen bewaarde plek draagt haar naam, ook als ze niet bij de recentste hoort', () => {
    const pair = pairFor('here', [home, ridge, lake], 'p_lake');
    expect(pair.other).toEqual({ label: 'Meerpad', chosen: true, aria: 'Andere plek: Meerpad' });
  });
  it('een gezochte plek die nog niet bewaard is draagt haar naam', () => {
    const pair = pairFor('here', [home], 'other', 'Dorp aan de rivier');
    expect(pair.other.label).toBe('Dorp aan de rivier');
    expect(pair.other.chosen).toBe(true);
  });
  it('Ongeveer valt onder Waar je nu bent', () => {
    expect(pairFor('approx', [home]).hereChosen).toBe(true);
  });
  it('een onbekende sleutel valt terug op Waar je nu bent', () => {
    expect(startPair([{ kind: 'here', label: 'Waar je nu bent' }], 'weg').hereChosen).toBe(true);
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
