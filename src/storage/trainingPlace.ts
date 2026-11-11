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
// heeft (geen route die even verschijnt en dan weggaat). Een tik staat er meteen bij (`pending`), tot
// hij bewaard is; mislukt het bewaren, dan valt hij weg en geldt weer wat er op het toestel staat.
// Luisteraars horen elke verandering: Vandaag en het blad achter de i volgen een tik op het
// trainingsscherm. Bewaren gebeurt een voor een (`chain`), zodat twee tikken elkaar niet overschrijven.
let cache: PlaceMap | undefined;
const pending = new Map<string, PlaceEntry>();
const listeners = new Set<() => void>();
let chain: Promise<unknown> = Promise.resolve();

function notify(): void {
  for (const l of listeners) l();
}

function view(): PlaceMap | undefined {
  if (!cache && pending.size === 0) return undefined;
  return { ...(cache ?? {}), ...Object.fromEntries(pending) };
}

async function readStored(): Promise<PlaceMap | undefined> {
  try {
    return cleanMap(await MetaRepo.get<unknown>(TRAINING_PLACE_KEY));
  } catch {
    return undefined;
  }
}

async function readMap(): Promise<PlaceMap> {
  const stored = await readStored();
  if (stored) cache = stored;
  return view() ?? {};
}

// Alle bewaarde keuzes, per geplande training: de sleutel, ongelezen.
export async function getTrainingPlaces(): Promise<Record<string, string>> {
  return keysOf(await readMap());
}

// Het laatst bekende, zonder te wachten; undefined als er nog niets gelezen is.
export function peekTrainingPlaces(): Record<string, string> | undefined {
  const map = view();
  return map ? keysOf(map) : undefined;
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
  pending.clear();
}

function keysOf(map: PlaceMap): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([id, e]) => [id, e.key]));
}

// De bewaarde keuze voor deze geplande training, ongelezen: de engine zegt of hij nog geldt.
export async function getTrainingPlace(plannedSessionId: string): Promise<string | undefined> {
  return (await readMap())[plannedSessionId]?.key;
}

// Bewaart de keuze. Geeft terug of het lukte; mislukt is niet erg, dan geldt de standaard weer.
export function saveTrainingPlace(plannedSessionId: string, date: string, key: string, today: string = todayISO()): Promise<boolean> {
  const entry: PlaceEntry = { key, date };
  pending.set(plannedSessionId, entry);
  notify();
  const run = chain.then(async () => {
    let ok = false;
    try {
      const stored = await readStored();
      if (stored) {
        const map = { ...stored, [plannedSessionId]: entry };
        const from = addDays(today, -KEEP_DAYS);
        const kept = Object.entries(map)
          .filter(([, e]) => e.date >= from)
          .sort((a, b) => b[1].date.localeCompare(a[1].date))
          .slice(0, MAX_ENTRIES);
        const next = Object.fromEntries(kept);
        await MetaRepo.set(TRAINING_PLACE_KEY, next);
        cache = next;
        ok = true;
      }
    } catch {
      ok = false;
    }
    // Een nieuwere tik op dezelfde training blijft staan tot hij zelf bewaard is.
    if (pending.get(plannedSessionId) === entry) pending.delete(plannedSessionId);
    notify();
    return ok;
  });
  chain = run;
  return run;
}
