// ASCEND: de feestdagen op dit toestel (engine/publicHolidays.ts,
// docs/beslissingen/2026-11-26-feestdagen-als-voorstel.md).
//
// Eén sleutel in de meta-opslag, nooit in de back-up: de feestdagen zijn altijd opnieuw op te halen
// (storage/backupExport.ts leest alleen de sleutels die het noemt). Per land en jaar eens opgehaald;
// vanaf december ook het volgende jaar. Een mislukte poging wordt niet als "geen feestdagen" bewaard,
// alleen als laatste uitkomst (`failure`), zodat de app zegt dat het niet lukte en het bij de volgende
// opening opnieuw probeert. Offline gaat alles door met wat er al staat.
//
// Alles samen heeft een grens van vijftien seconden, elke aanvraag tien. Gooit nooit.

import { MetaRepo } from './database';
import { fetchPublicHolidays, type FetchOptions } from '../integrations/publicHolidays';
import { holidayYearsDue, type HolidayYear } from '../engine/publicHolidays';
import type { PublicHoliday } from '../models/publicHoliday';
import { todayISO } from '../utils/dates';

export const HOLIDAYS_KEY = 'publicHolidays';
export const HOLIDAYS_LIMIT_MS = 15_000;
const MAX_YEARS = 12;

export type HolidayFailure = 'offline' | 'timeout' | 'failed';

interface HolidayStore {
  years: HolidayYear[];
  // De laatste poging die mislukte, per land; weg zodra het lukt.
  failure?: { country: string; kind: HolidayFailure; at: string };
}

export interface HolidayRefresh {
  // off: de instelling staat uit, er is niets gevraagd. ready: alles stond er al. fetched: nieuw opgehaald.
  // failed: ophalen lukte niet; `holidays` is wat er al stond.
  status: 'off' | 'ready' | 'fetched' | 'failed';
  failure?: HolidayFailure;
  holidays: PublicHoliday[];
}

const isHoliday = (h: unknown): h is PublicHoliday => {
  const x = h as PublicHoliday | null;
  return !!x && typeof x.date === 'string' && typeof x.name === 'string' && typeof x.country === 'string' && typeof x.source === 'string';
};

export async function readHolidayStore(): Promise<HolidayStore> {
  try {
    const raw = await MetaRepo.get<unknown>(HOLIDAYS_KEY);
    const r = raw as Partial<HolidayStore> | undefined;
    const years = Array.isArray(r?.years)
      ? r!.years.filter((y): y is HolidayYear => !!y && typeof y.country === 'string' && typeof y.year === 'number' && typeof y.fetchedAt === 'string' && Array.isArray(y.holidays))
        .map((y) => ({ ...y, holidays: y.holidays.filter(isHoliday) }))
      : [];
    const f = r?.failure;
    const failure = f && typeof f.country === 'string' && typeof f.at === 'string' && (f.kind === 'offline' || f.kind === 'timeout' || f.kind === 'failed') ? f : undefined;
    return { years, ...(failure ? { failure } : {}) };
  } catch {
    return { years: [] };
  }
}

async function write(store: HolidayStore): Promise<void> {
  try {
    await MetaRepo.set(HOLIDAYS_KEY, store);
  } catch {
    // Niet bewaard: de volgende keer wordt het opnieuw gevraagd.
  }
}

const holidaysOf = (store: HolidayStore, country: string) => store.years.filter((y) => y.country === country).flatMap((y) => y.holidays).sort((a, b) => a.date.localeCompare(b.date));

function failureOf(err: unknown): HolidayFailure {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if ((err as { name?: string } | null)?.name === 'AbortError' || (err as Error | null)?.message === 'timeout') return 'timeout';
  if (err instanceof TypeError) return 'offline';
  return 'failed';
}

// Wat er al staat, zonder te vragen.
export async function readPublicHolidays(country: string): Promise<PublicHoliday[]> {
  return holidaysOf(await readHolidayStore(), country);
}

// Eén poging tegelijk per land: Week en Instellingen vragen nooit twee keer hetzelfde.
const running = new Map<string, Promise<HolidayRefresh>>();

export interface RefreshOptions extends FetchOptions {
  enabled: boolean;
  country: string;
  today?: string;
  now?: Date;
  limitMs?: number;
}

export function refreshPublicHolidays(options: RefreshOptions): Promise<HolidayRefresh> {
  if (!options.enabled) return Promise.resolve({ status: 'off', holidays: [] });
  const key = options.country;
  const busy = running.get(key);
  if (busy) return busy;
  const work = refresh(options).finally(() => running.delete(key));
  running.set(key, work);
  return work;
}

async function refresh(options: RefreshOptions): Promise<HolidayRefresh> {
  const { country } = options;
  const today = options.today ?? todayISO();
  const now = options.now ?? new Date();
  const store = await readHolidayStore();
  const due = holidayYearsDue(store.years, country, today);
  if (due.length === 0) return { status: 'ready', holidays: holidaysOf(store, country) };
  const failed = async (kind: HolidayFailure): Promise<HolidayRefresh> => {
    const latest = await readHolidayStore();
    await write({ ...latest, failure: { country, kind, at: now.toISOString() } });
    return { status: 'failed', failure: kind, holidays: holidaysOf(latest, country) };
  };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return failed('offline');

  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), options.limitMs ?? HOLIDAYS_LIMIT_MS); });
  try {
    const fetched = await Promise.race([
      Promise.all(due.map(async (year) => ({ country, year, fetchedAt: now.toISOString(), holidays: await fetchPublicHolidays(year, country, options) }))),
      limit,
    ]);
    const latest = await readHolidayStore();
    const keepFrom = Number(today.slice(0, 4)) - 1;
    const years = [...fetched, ...latest.years.filter((y) => !fetched.some((f) => f.country === y.country && f.year === y.year))]
      .filter((y) => y.year >= keepFrom)
      .slice(0, MAX_YEARS);
    const next: HolidayStore = { years, ...(latest.failure && latest.failure.country !== country ? { failure: latest.failure } : {}) };
    await write(next);
    return { status: 'fetched', holidays: holidaysOf(next, country) };
  } catch (err) {
    return failed(failureOf(err));
  } finally {
    clearTimeout(timer);
  }
}
