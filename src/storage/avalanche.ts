// ASCEND: het lawinegevaar bij een tocht, op dit toestel bewaard (engine/avalanche.ts). Twee kleine
// caches onder eigen sleutels, nooit in de back-up:
// - per plek (afgerond op twee decimalen) welk waarschuwingsgebied erbij hoort, een maand lang; ook
//   "geen gebied", zodat een plek buiten de Alpen niet steeds de bestanden ophaalt. De bestanden met
//   gebieden zelf worden niet bewaard: ze zijn te groot en alleen nodig om dat ene gebied te vinden.
// - per dag en gebied de gevarenklasse, hoogstens eens per drie uur opgehaald.
// Alles samen heeft een grens van vijftien seconden. Gooit nooit: zonder antwoord is er geen regel.

import { MetaRepo } from './database';
import { fetchRatings, fetchRegions, type FetchOptions } from '../integrations/eaws';
import { regionAt, regionFilesAt } from '../engine/avalanche';
import { roundCoordinate } from '../integrations/openMeteo';
import type { WeatherPlace } from '../models/weather';

const REGION_KEY = 'avalancheRegions';
const LEVEL_KEY = 'avalancheLevels';
export const REGION_KEEP_DAYS = 30;
export const LEVEL_FETCH_HOURS = 3;
export const AVALANCHE_LIMIT_MS = 15_000;
const MAX_REGIONS = 8;
const MAX_LEVELS = 4;

interface RegionMemo { key: string; region: string | null; checkedAt: string }
interface LevelMemo { date: string; region: string; level: number | null; fetchedAt: string }

const placeKey = (p: WeatherPlace) => `${roundCoordinate(p.lat)},${roundCoordinate(p.lon)}`;

async function readList<T>(key: string, ok: (x: T) => boolean): Promise<T[]> {
  try {
    const v = await MetaRepo.get<unknown>(key);
    return Array.isArray(v) ? (v as T[]).filter((x) => !!x && typeof x === 'object' && ok(x)) : [];
  } catch {
    return [];
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await MetaRepo.set(key, value);
  } catch {
    // Niet bewaard: de volgende keer wordt het opnieuw gevraagd.
  }
}

const age = (iso: string, now: Date) => now.getTime() - Date.parse(iso);

async function regionFor(place: WeatherPlace, date: string, now: Date, options: FetchOptions): Promise<string | undefined> {
  const key = placeKey(place);
  const memos = await readList<RegionMemo>(REGION_KEY, (m) => typeof m.key === 'string' && typeof m.checkedAt === 'string');
  const memo = memos.find((m) => m.key === key);
  if (memo && age(memo.checkedAt, now) < REGION_KEEP_DAYS * 86_400_000) return memo.region ?? undefined;
  let region: string | undefined;
  let answered = false;
  for (const file of regionFilesAt(place.lat, place.lon)) {
    try {
      region = regionAt(await fetchRegions(file, options), place.lat, place.lon, date);
      answered = true;
    } catch {
      // Dit bestand kwam niet binnen; het volgende kan het gebied ook bevatten.
    }
    if (region) break;
  }
  // Alleen onthouden wat zeker is: een gebied, of een plek waar alle bestanden antwoordden zonder gebied.
  if (region || answered || regionFilesAt(place.lat, place.lon).length === 0) {
    await write(REGION_KEY, [{ key, region: region ?? null, checkedAt: now.toISOString() }, ...memos.filter((m) => m.key !== key)].slice(0, MAX_REGIONS));
  }
  return region;
}

async function levelFor(region: string, date: string, now: Date, options: FetchOptions): Promise<number | undefined> {
  const memos = await readList<LevelMemo>(LEVEL_KEY, (m) => typeof m.date === 'string' && typeof m.region === 'string' && typeof m.fetchedAt === 'string');
  const memo = memos.find((m) => m.date === date && m.region === region);
  if (memo && age(memo.fetchedAt, now) < LEVEL_FETCH_HOURS * 3_600_000) return memo.level ?? undefined;
  try {
    const level = (await fetchRatings(date, options))[region];
    await write(LEVEL_KEY, [{ date, region, level: level ?? null, fetchedAt: now.toISOString() }, ...memos.filter((m) => !(m.date === date && m.region === region))].slice(0, MAX_LEVELS));
    return level;
  } catch {
    // Geen bulletin voor die dag (nog niet uit, of buiten het seizoen) of geen netwerk: de vorige, of niets.
    return memo?.level ?? undefined;
  }
}

// De gevarenklasse (1 tot 5) voor die plek en dag, of undefined.
export function refreshAvalancheLevel(place: WeatherPlace, date: string, options: FetchOptions & { now?: Date; limitMs?: number } = {}): Promise<number | undefined> {
  const now = options.now ?? new Date();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), options.limitMs ?? AVALANCHE_LIMIT_MS); });
  const work = (async () => {
    const region = await regionFor(place, date, now, options);
    return region ? levelFor(region, date, now, options) : undefined;
  })().catch(() => undefined);
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}
