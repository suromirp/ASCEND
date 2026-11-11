// ASCEND: de keuze Waar train je? per geplande training, op dit toestel.
//
// Eén sleutel in de meta-opslag met per geplande training de gekozen sleutel en de dag. Bewust niet in
// de export en niet in een back-up (docs/beslissingen/2026-11-11-briefing-sporen-1-3-4.md): het is
// een voorkeur voor één training die binnen dagen voorbij is, en wat er echt gebeurde staat in het log
// (modality en environment). Daarom ook geen migratie. Een back-up of import raakt de sleutel niet: de
// back-up schrijft en wist alleen de meta-sleutels die hij kent.
//
// Lezen en schrijven gooien nooit: zonder opslag geldt de standaard (engine/trainingPlace.ts).

import { MetaRepo } from './database';
import { addDays, todayISO } from '../utils/dates';

export const TRAINING_PLACE_KEY = 'trainingPlaces';
// Ouder dan dit (de dag van de training) gaat weg bij de volgende keuze; een plafond voor de zekerheid.
const KEEP_DAYS = 14;
const MAX_ENTRIES = 100;

interface PlaceEntry {
  key: string;
  date: string;
}

type PlaceMap = Record<string, PlaceEntry>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanMap(raw: unknown): PlaceMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PlaceMap = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = value as Partial<PlaceEntry> | null;
    if (v && typeof v === 'object' && typeof v.key === 'string' && typeof v.date === 'string' && ISO_DATE.test(v.date)) {
      out[id] = { key: v.key, date: v.date };
    }
  }
  return out;
}

async function readMap(): Promise<PlaceMap> {
  try {
    return cleanMap(await MetaRepo.get<unknown>(TRAINING_PLACE_KEY));
  } catch {
    return {};
  }
}

// De bewaarde keuze voor deze geplande training, ongelezen: de engine zegt of hij nog geldt.
export async function getTrainingPlace(plannedSessionId: string): Promise<string | undefined> {
  return (await readMap())[plannedSessionId]?.key;
}

// Bewaart de keuze. Geeft terug of het lukte; mislukt is niet erg, dan geldt de standaard weer.
export async function saveTrainingPlace(plannedSessionId: string, date: string, key: string, today: string = todayISO()): Promise<boolean> {
  try {
    const map = await readMap();
    map[plannedSessionId] = { key, date };
    const from = addDays(today, -KEEP_DAYS);
    const kept = Object.entries(map)
      .filter(([, e]) => e.date >= from)
      .sort((a, b) => b[1].date.localeCompare(a[1].date))
      .slice(0, MAX_ENTRIES);
    await MetaRepo.set(TRAINING_PLACE_KEY, Object.fromEntries(kept));
    return true;
  } catch {
    return false;
  }
}
