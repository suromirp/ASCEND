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

// Wat er het laatst gelezen of bewaard is, zodat een scherm dat later opent meteen de goede stand
// heeft (geen route die even verschijnt en dan weggaat). Luisteraars horen een nieuwe keuze meteen:
// Vandaag en het blad achter de i volgen een tik op het trainingsscherm.
let cache: PlaceMap | undefined;
const listeners = new Set<() => void>();

function publish(map: PlaceMap): void {
  cache = map;
  for (const l of listeners) l();
}

async function readStored(): Promise<PlaceMap | undefined> {
  try {
    return cleanMap(await MetaRepo.get<unknown>(TRAINING_PLACE_KEY));
  } catch {
    return undefined;
  }
}

// Lezen vult de cache, behalve terwijl er een keuze bewaard wordt: dan wint die keuze.
let saving = 0;
async function readMap(): Promise<PlaceMap> {
  const stored = await readStored();
  if (stored && saving === 0) cache = stored;
  return saving > 0 ? (cache ?? stored ?? {}) : (stored ?? cache ?? {});
}

// Alle bewaarde keuzes, per geplande training: de sleutel, ongelezen.
export async function getTrainingPlaces(): Promise<Record<string, string>> {
  return keysOf(await readMap());
}

// Het laatst bekende, zonder te wachten; undefined als er nog niets gelezen is.
export function peekTrainingPlaces(): Record<string, string> | undefined {
  return cache ? keysOf(cache) : undefined;
}

export function onTrainingPlaceChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Alleen voor tests: alsof de app net start.
export function resetTrainingPlaceCache(): void {
  cache = undefined;
}

function keysOf(map: PlaceMap): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([id, e]) => [id, e.key]));
}

// De bewaarde keuze voor deze geplande training, ongelezen: de engine zegt of hij nog geldt.
export async function getTrainingPlace(plannedSessionId: string): Promise<string | undefined> {
  return (await readMap())[plannedSessionId]?.key;
}

// Bewaart de keuze. Geeft terug of het lukte; mislukt is niet erg, dan geldt de standaard weer.
export async function saveTrainingPlace(plannedSessionId: string, date: string, key: string, today: string = todayISO()): Promise<boolean> {
  try {
    // Meteen zichtbaar voor de andere schermen, ook als het schrijven nog loopt.
    saving += 1;
    publish({ ...(cache ?? {}), [plannedSessionId]: { key, date } });
    const map = { ...((await readStored()) ?? {}), [plannedSessionId]: { key, date } };
    const from = addDays(today, -KEEP_DAYS);
    const kept = Object.entries(map)
      .filter(([, e]) => e.date >= from)
      .sort((a, b) => b[1].date.localeCompare(a[1].date))
      .slice(0, MAX_ENTRIES);
    const next = Object.fromEntries(kept);
    await MetaRepo.set(TRAINING_PLACE_KEY, next);
    saving -= 1;
    publish(next);
    return true;
  } catch {
    saving = Math.max(0, saving - 1);
    return false;
  }
}
