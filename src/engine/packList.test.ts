import { describe, it, expect } from 'vitest';
import { DEFAULT_PACK_ITEMS, PACK_GROUPS, type PackItem } from '../data/packList';
import {
  addItem, baseWeightGrams, departureTable, departureWeightKg, formatGrams, formatKg, groupWeightGrams, normalizePackList, packProgress, packVersusGoal,
  removeItem, resolvePackItems, updateItem,
} from './packList';

describe('the example list', () => {
  it('comes to about 7,8 kg base weight, as in the research', () => {
    expect(baseWeightGrams(DEFAULT_PACK_ITEMS)).toBe(7835);
    expect(formatKg(baseWeightGrams(DEFAULT_PACK_ITEMS))).toBe('7,8 kg');
  });

  it('adds up per group like the research does', () => {
    expect(groupWeightGrams(DEFAULT_PACK_ITEMS, 'slapen')).toBe(3820); // about 3,8 kg
    expect(groupWeightGrams(DEFAULT_PACK_ITEMS, 'koken')).toBe(800); // about 0,8 kg
    expect(groupWeightGrams(DEFAULT_PACK_ITEMS, 'kleding')).toBe(1900); // about 1,9 kg
    expect(groupWeightGrams(DEFAULT_PACK_ITEMS, 'elektronica')).toBe(565); // about 0,6 kg
    expect(groupWeightGrams(DEFAULT_PACK_ITEMS, 'verzorging')).toBe(750); // about 0,75 kg
  });

  it('has unique ids, known groups, nothing owned yet and no dashes in the text', () => {
    const ids = DEFAULT_PACK_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of DEFAULT_PACK_ITEMS) {
      expect(PACK_GROUPS).toContain(i.group);
      expect(i.have).toBe(false);
      expect(i.grams).toBeGreaterThan(0);
      expect(i.name).not.toMatch(/[–—]/);
    }
  });

  it('is what you get until you change it', () => {
    expect(resolvePackItems(undefined)).toBe(DEFAULT_PACK_ITEMS);
    expect(resolvePackItems({ v: 1, items: [] })).toEqual([]);
  });
});

describe('the weight you leave a village with', () => {
  const base = baseWeightGrams(DEFAULT_PACK_ITEMS);

  it('adds food (0,9 kg a day) and water (1 kg a litre)', () => {
    expect(departureWeightKg(7000, 0, 0)).toBe(7);
    expect(departureWeightKg(7000, 2, 3)).toBeCloseTo(11.8, 5);
  });

  it('matches the research: three days and 2 litres is about 12,5 kg, four days and 3 litres about 14,5 kg', () => {
    expect(departureWeightKg(base, 3, 2)).toBeCloseTo(12.5, 1);
    expect(departureWeightKg(base, 4, 3)).toBeCloseTo(14.4, 1);
  });

  it('gives two, three and four days of food with two or three litres', () => {
    const table = departureTable(base);
    expect(table.map((r) => r.foodDays)).toEqual([2, 3, 4]);
    expect(table.every((r) => r.kg.length === 2)).toBe(true);
    expect(table[0].kg[1] - table[0].kg[0]).toBeCloseTo(1, 5); // one litre more
    expect(table[1].kg[0] - table[0].kg[0]).toBeCloseTo(0.9, 5); // one day more food
  });
});

describe('the list against the goal', () => {
  const base = 7835; // 3 days and 2 litres: 12,535 kg

  it('says nothing when the goal has no pack weight', () => {
    expect(packVersusGoal(base, undefined)).toBeUndefined();
    expect(packVersusGoal(base, 0)).toBeUndefined();
  });

  it('says in one sentence how far under or over the goal you are', () => {
    expect(packVersusGoal(base, 14)).toBe('Je doel is 14 kg en met 3 dagen eten en 2 liter water vertrek je met 12,5 kg: 1,5 kg onder je doel.');
    expect(packVersusGoal(base, 12)).toBe('Je doel is 12 kg en met 3 dagen eten en 2 liter water vertrek je met 12,5 kg: 0,5 kg boven je doel.');
    expect(packVersusGoal(7800, 12.5)).toContain('precies op je doel');
  });

  it('uses no dashes', () => {
    expect(packVersusGoal(base, 14)).not.toMatch(/[–—]/);
  });
});

describe('changing the list', () => {
  it('edits, adds and removes without touching the old list', () => {
    const list: PackItem[] = [
      { id: 'a', group: 'slapen', name: 'Tent', grams: 1100, have: false },
      { id: 'b', group: 'koken', name: 'Pan', grams: 100, have: true },
    ];
    const edited = updateItem(list, 'a', { grams: 950, have: true });
    expect(list[0].grams).toBe(1100);
    expect(edited[0]).toEqual({ id: 'a', group: 'slapen', name: 'Tent', grams: 950, have: true });
    const added = addItem(edited, { id: 'c', group: 'overig', name: 'Boek', grams: 200, have: false });
    expect(baseWeightGrams(added)).toBe(1250);
    expect(packProgress(added)).toEqual({ have: 2, total: 3 });
    expect(removeItem(added, 'a').map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('shows grams with a thousands dot and kilos with a comma', () => {
    expect(formatGrams(1100)).toBe('1.100 g');
    expect(formatGrams(60)).toBe('60 g');
    expect(formatKg(12535)).toBe('12,5 kg');
  });
});

describe('reading what is stored', () => {
  it('keeps good items, repairs the group and counts the bad ones', () => {
    const { state, skipped } = normalizePackList({
      v: 1,
      items: [
        { id: 'a', group: 'slapen', name: ' Tent ', grams: 1099.6, have: true },
        { id: 'b', group: 'onbekend', name: 'Pan', grams: 100 },
        { id: 'c', group: 'koken', name: '', grams: 100 },
        { id: 'd', group: 'koken', name: 'Gas', grams: 'veel' },
        { id: 'e', group: 'koken', name: 'Gas', grams: -5 },
        { id: 'a', group: 'koken', name: 'Dubbel', grams: 5 },
        'junk',
      ],
    });
    expect(state?.items).toEqual([
      { id: 'a', group: 'slapen', name: 'Tent', grams: 1100, have: true },
      { id: 'b', group: 'overig', name: 'Pan', grams: 100, have: false },
    ]);
    expect(skipped).toBe(5);
  });

  it('keeps an emptied list empty, and says nothing is stored when it is not', () => {
    expect(normalizePackList({ v: 1, items: [] })).toEqual({ state: { v: 1, items: [] }, skipped: 0 });
    expect(normalizePackList(undefined)).toEqual({ state: undefined, skipped: 0 });
    expect(normalizePackList({ v: 1, items: 'oops' })).toEqual({ state: undefined, skipped: 1 });
  });
});
