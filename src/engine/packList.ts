// ASCEND — Paklijst: the sums behind the packing list with weights
// (data/packList.ts is the example to start from).
//
// Base weight is everything that sits in the pack, without food and water.
// The weight you leave a village with adds food and water to that. Pure: no
// React, no IndexedDB.

import { DEFAULT_PACK_ITEMS, PACK_GROUPS, type PackGroup, type PackItem } from '../data/packList';
import { formatNumberNL } from '../utils/number';
import { isRecord } from '../utils/guards';

// What is stored (AppSettings.packList). Absent means: the example list.
// `v` is the shape's own version, for a later migration.
export interface PackListState {
  v: 1;
  items: PackItem[];
}

// Dry food per day: 0,8 to 1,0 kg at 400 to 500 kcal per 100 g, so 0,9.
// Water: one litre weighs one kilo.
export const FOOD_KG_PER_DAY = 0.9;
export const FOOD_DAY_OPTIONS = [2, 3, 4];
export const WATER_LITER_OPTIONS = [2, 3];
// The case the goal is compared with: the usual one for leaving a village.
export const REFERENCE_FOOD_DAYS = 3;
export const REFERENCE_WATER_LITERS = 2;

export function resolvePackItems(stored: PackListState | undefined): PackItem[] {
  return stored ? stored.items : DEFAULT_PACK_ITEMS;
}

export function baseWeightGrams(items: PackItem[]): number {
  return items.reduce((sum, i) => sum + i.grams, 0);
}

export function groupWeightGrams(items: PackItem[], group: PackGroup): number {
  return baseWeightGrams(items.filter((i) => i.group === group));
}

export function packProgress(items: PackItem[]): { have: number; total: number } {
  return { have: items.filter((i) => i.have).length, total: items.length };
}

export function departureWeightKg(baseGrams: number, foodDays: number, waterLiters: number): number {
  return baseGrams / 1000 + foodDays * FOOD_KG_PER_DAY + waterLiters;
}

export interface DepartureRow {
  foodDays: number;
  // One weight per option in WATER_LITER_OPTIONS, in that order.
  kg: number[];
}

export function departureTable(baseGrams: number): DepartureRow[] {
  return FOOD_DAY_OPTIONS.map((foodDays) => ({
    foodDays,
    kg: WATER_LITER_OPTIONS.map((liters) => departureWeightKg(baseGrams, foodDays, liters)),
  }));
}

// One sentence on how the list compares with the goal's pack weight, or
// undefined when the goal has none. Compares at three days of food and two
// litres of water.
export function packVersusGoal(baseGrams: number, goalKg: number | undefined): string | undefined {
  if (goalKg === undefined || !(goalKg > 0)) return undefined;
  const kg = departureWeightKg(baseGrams, REFERENCE_FOOD_DAYS, REFERENCE_WATER_LITERS);
  const diff = Math.round((kg - goalKg) * 10) / 10;
  const lead = `Je doel is ${formatNumberNL(goalKg, 1)} kg en met ${REFERENCE_FOOD_DAYS} dagen eten en ${REFERENCE_WATER_LITERS} liter water vertrek je met ${formatNumberNL(kg, 1)} kg`;
  if (diff === 0) return `${lead}: precies op je doel.`;
  return diff < 0
    ? `${lead}: ${formatNumberNL(-diff, 1)} kg onder je doel.`
    : `${lead}: ${formatNumberNL(diff, 1)} kg boven je doel.`;
}

// Grams as the list shows them, also above a thousand: "1.100 g".
export function formatGrams(grams: number): string {
  return `${formatNumberNL(grams, 0)} g`;
}

export function formatKg(grams: number): string {
  return `${formatNumberNL(grams / 1000, 1)} kg`;
}

// --- changes (each returns a new list; nothing is mutated) -----------------------

export function updateItem(items: PackItem[], id: string, patch: Partial<Pick<PackItem, 'name' | 'grams' | 'have' | 'group'>>): PackItem[] {
  return items.map((i) => (i.id === id ? { ...i, ...patch } : i));
}

export function addItem(items: PackItem[], item: PackItem): PackItem[] {
  return [...items, item];
}

export function removeItem(items: PackItem[], id: string): PackItem[] {
  return items.filter((i) => i.id !== id);
}

// --- reading what is stored ---------------------------------------------------------


// A backup can be old, hand-edited or cut off. Keeps the items that have a
// name and a sensible weight and counts the rest. An unknown group falls
// back to "overig". An empty list stays an empty list (you may have removed
// everything); only a missing or unreadable one means "no list".
export function normalizePackList(raw: unknown): { state?: PackListState; skipped: number } {
  if (!isRecord(raw)) return { state: undefined, skipped: raw === undefined ? 0 : 1 };
  if (!Array.isArray(raw.items)) return { state: undefined, skipped: 1 };
  let skipped = 0;
  const seen = new Set<string>();
  const items: PackItem[] = [];
  for (const r of raw.items) {
    if (!isRecord(r) || typeof r.id !== 'string' || !r.id || typeof r.name !== 'string' || !r.name.trim() || typeof r.grams !== 'number' || !Number.isFinite(r.grams) || r.grams < 0 || seen.has(r.id)) {
      skipped++;
      continue;
    }
    seen.add(r.id);
    items.push({
      id: r.id,
      group: PACK_GROUPS.includes(r.group as PackGroup) ? (r.group as PackGroup) : 'overig',
      name: r.name.trim(),
      grams: Math.round(r.grams),
      have: r.have === true,
    });
  }
  return { state: { v: 1, items }, skipped };
}
