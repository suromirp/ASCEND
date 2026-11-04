// ASCEND: lichaamsgewicht uit Health Connect (docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md).
//
// integrations/healthConnect.ts geeft per dag één BodyMetric (de eerste weging van de dag, met het
// vetpercentage van die dag). Hier wordt dat een gewone WeightEntry met `source: 'health-connect'` in
// dezelfde lijst als elk ander gewicht (AppSettings.weightEntries), en wordt de lijst bijgewerkt.
//
// Wat hier nooit gebeurt: een gewicht dat je zelf invulde of uit MacroFactor inlas veranderen of
// weghalen. Die staan op hun eigen plek in de lijst; welk gewicht op een dag telt, zegt
// engine/bodyWeight.ts#weightsInUse (vaste voorrang). Puur: geen React, geen opslag, geen plugin.

import type { BodyMetric, WeightEntry } from '../models/metrics';
import { isPlausibleFatPct } from './bodyFat';
import { addDays } from '../utils/dates';

// Een getal daarbuiten is geen lichaamsgewicht in kilo's, maar een fout van de bron.
export const HC_MIN_KG = 30;
export const HC_MAX_KG = 250;
// Hoe lang een weging uit Health Connect blijft staan, zoals bij MacroFactor.
export const HC_WEIGHT_KEEP_DAYS = 365;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function weightEntryFromBody(m: BodyMetric): WeightEntry | undefined {
  if (m.source !== 'health-connect') return undefined;
  const kg = m.weightKg;
  if (typeof kg !== 'number' || !Number.isFinite(kg) || kg < HC_MIN_KG || kg > HC_MAX_KG) return undefined;
  const entry: WeightEntry = { date: m.date, kg: round1(kg), source: 'health-connect', basis: 'scale' };
  if (isPlausibleFatPct(m.bodyFatPct)) entry.fatPct = round1(m.bodyFatPct);
  return entry;
}

const same = (a: WeightEntry, b: WeightEntry) => a.kg === b.kg && a.fatPct === b.fatPct && a.basis === b.basis;

// De nieuwe lijst na een ronde: per dag één weging uit Health Connect, die wordt ververst als Health
// Connect iets anders zegt. Een dag die Health Connect niet meer teruggeeft blijft staan (het is je
// meting); alleen wegingen uit Health Connect ouder dan een jaar gaan eruit. `changed` telt de dagen
// die nieuw of anders zijn, plus wat wegging; bij nul is `entries` de lijst die erin ging.
export function mergeHealthWeights(existing: WeightEntry[] | undefined, incoming: readonly WeightEntry[], today: string): { entries: WeightEntry[]; changed: number } {
  const list = existing ?? [];
  const cutoff = addDays(today, -HC_WEIGHT_KEEP_DAYS);
  const ours = new Map<string, WeightEntry>();
  const rest: WeightEntry[] = [];
  let changed = 0;
  for (const e of list) {
    if (e.source !== 'health-connect') rest.push(e);
    else if (e.date < cutoff) changed++;
    else ours.set(e.date, e);
  }
  for (const e of incoming) {
    if (e.source !== 'health-connect' || e.date < cutoff) continue;
    const current = ours.get(e.date);
    if (current && same(current, e)) continue;
    ours.set(e.date, e);
    changed++;
  }
  if (changed === 0) return { entries: existing ?? [], changed };
  return { entries: [...rest, ...ours.values()].sort((a, b) => a.date.localeCompare(b.date)), changed };
}
