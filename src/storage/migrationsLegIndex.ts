// Je eigen beenindex (Rooster ronde 6, docs/beslissingen/2026-11-26-beenindex-leert.md): twee lijsten en één keuze
// in de instellingen, `legAnswers`, `legFactorLog` en `legIndexLearning`. Optioneel en additief, dus het schemanummer
// van de back-up blijft 6: een bestand van voor deze velden heeft ze niet, en dat betekent "niet in deze back-up".
// Dan blijft wat op het toestel staat, en zonder iets is de factor 1: de standaardindex. Een kapotte rij valt weg
// en telt als overgeslagen; deze stappen gooien nooit.

import type { LegAnswer, LegFactorEntry, LegFactorSource } from '../models/legIndex';
import { ISO_DAY, isObj, fin } from './migrationsShared';

const LEGS: readonly LegAnswer['legs'][] = ['fris', 'stijf', 'spierpijn', 'flink', 'goed'];
const SOURCES: readonly LegFactorSource[] = ['akkoord', 'liever-niet', 'standaard', 'uit'];
// Ruim boven wat de app bewaart (180 dagen, één per dag; besluiten hoogstens een paar per jaar), zodat een kapot
// bestand niet onbegrensd groeit.
export const MAX_LEG_ANSWERS = 400;
export const MAX_LEG_FACTOR_LOG = 200;

export function migrateLegAnswers(raw: unknown): { list: LegAnswer[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byDate = new Map<string, LegAnswer>();
  let skipped = 0;
  for (const item of raw) {
    if (!isObj(item) || typeof item.date !== 'string' || !ISO_DAY.test(item.date) || !LEGS.includes(item.legs as LegAnswer['legs'])) {
      skipped++;
      continue;
    }
    // Eén rij per datum; de eerste blijft, want een rij wordt nooit herschreven.
    if (byDate.has(item.date)) continue;
    const legs = item.legs as LegAnswer['legs'];
    byDate.set(item.date, {
      date: item.date, legs,
      ...(item.upper === true && (legs === 'spierpijn' || legs === 'flink') ? { upper: true as const } : {}),
      ...(item.from === 'voorstel' || item.from === 'zelf' ? { from: item.from } : {}),
    });
  }
  return { list: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_LEG_ANSWERS), skipped };
}

export function migrateLegFactorLog(raw: unknown): { list: LegFactorEntry[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const list: LegFactorEntry[] = [];
  let skipped = 0;
  for (const item of raw) {
    if (!isObj(item) || typeof item.at !== 'string' || Number.isNaN(Date.parse(item.at)) || !SOURCES.includes(item.source as LegFactorSource) || !fin(item.factor)) {
      skipped++;
      continue;
    }
    // Een factor buiten de band leest de app als de grens (engine/legFatigue.ts#clampFactor); hier blijft het getal.
    list.push({ at: item.at, factor: item.factor, source: item.source as LegFactorSource });
  }
  return { list: list.sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_LEG_FACTOR_LOG), skipped };
}
