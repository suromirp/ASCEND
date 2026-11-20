// ASCEND: één ochtend per dag (docs/beslissingen/2026-11-20-ochtend-dubbel.md).
//
// Een back-up zonder id per ochtend krijgt bij het inlezen `import:<datum>`
// (storage/migrationsBody.ts#migrateMornings). Dat is een ochtend zonder bron: niemand weet waar
// en wanneer hij gemeten is. Staat er op dezelfde dag ook een ochtend met een bron (opgehaald van
// je horloge, of met de hand ingevuld), dan gaat die voor. De ochtend zonder bron gaat weg zodra
// elk getal dat hij heeft ook op de andere staat; heeft hij een getal dat de andere mist, dan
// blijft hij als aanvulling en leest de app hem als laatste (engine/sourcePrecedence.ts).
//
// Puur: geen React, geen IndexedDB.

import type { RecoveryMetric } from '../models/metrics';
import { isSourcelessMorning } from './sourcePrecedence';

const NUMBERS = ['restingHeartRate', 'hrv', 'sleepMinutes', 'sleepScore'] as const;

// De ochtenden zonder bron die niets toevoegen aan een ochtend met een bron op dezelfde dag.
// `others`: ochtenden die er ook staan (of komen) en mee dekken, maar zelf niet beoordeeld worden.
export function doubleMornings(records: readonly RecoveryMetric[], others: readonly RecoveryMetric[] = []): RecoveryMetric[] {
  const sourced = new Map<string, RecoveryMetric[]>();
  for (const r of [...records, ...others]) {
    if (isSourcelessMorning(r.id)) continue;
    const list = sourced.get(r.date);
    if (list) list.push(r);
    else sourced.set(r.date, [r]);
  }
  return records.filter((r) => {
    if (!isSourcelessMorning(r.id)) return false;
    const same = sourced.get(r.date);
    return !!same && NUMBERS.every((key) => r[key] === undefined || same.some((s) => s[key] !== undefined));
  });
}

// Wat een import van de ochtenden uit het bestand schrijft: niets wat het toestel al heeft (zelfde
// id), en geen ochtend zonder bron die niets toevoegt aan wat het toestel of het bestand zelf met
// een bron heeft.
export function morningsToImport(device: readonly RecoveryMetric[], incoming: readonly RecoveryMetric[]): RecoveryMetric[] {
  const have = new Set(device.map((m) => m.id));
  const fresh = incoming.filter((m) => !have.has(m.id));
  const drop = new Set(doubleMornings(fresh, device).map((m) => m.id));
  return fresh.filter((m) => !drop.has(m.id));
}

// Hoort deze ochtend bij de koppeling met je horloge? Wat daar opgehaald is, en een ochtend zonder
// bron: ASCEND heeft geen scherm om een ochtend in te vullen, dus die kwam ooit ook van een
// koppeling. Een ochtend die je met de hand invulde (`manual:`) of van een andere bron hoort er
// nooit bij.
export function belongsToLink(id: string, fetchedPrefix: string): boolean {
  return id.startsWith(fetchedPrefix) || isSourcelessMorning(id);
}
