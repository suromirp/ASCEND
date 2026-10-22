// ASCEND: local state of the MacroFactor import.
//
// Three small records, each under its own meta key, on this device only:
// - the file as last read (the workouts in it), so the card survives a
//   restart, plus the ones the user said "Niet opslaan" to,
// - the one-time choice of which ASCEND template each MacroFactor workout
//   name is,
// - a file handed over by "Delen, ASCEND" (see public/share-target-sw.js),
//   waiting in the Cache Storage until the app takes it.
//
// None of it is part of the export, and that is on purpose. The workouts are
// a copy of data that is in MacroFactor, and the naming choice is a few taps
// (it is asked again for each new name, and "Vergeet" takes one back). What
// matters, the logs, is in the export and carries its externalId. Keeping
// these out of the backup means no change to the persisted shape.
// buildBackupEnvelope names what it exports one by one (tested in
// macrofactor.test.ts).

import { MetaRepo, SessionLogsRepo } from './database';
import { readMacroFactorCsv, nameKey, type MacroFactorReadResult, type MacroFactorWorkout } from '../engine/macrofactorImport';
import { supplementPatch, type NameMapping } from '../engine/macrofactorLink';
import { enrichStrengthData } from '../engine/macrofactorEnrich';
import type { SessionTemplate } from '../models/training';

const STATE_KEY = 'macrofactorWorkouts';
const MAPPING_KEY = 'macrofactorMapping';
// Name keys linked "als losse krachttraining" (a list; same place, same rules as the mapping).
const LOOSE_KEY = 'macrofactorLoose';

export interface MacroFactorState {
  // When the file was read (ISO timestamp) and what it was called.
  readAt?: string;
  fileName?: string;
  workouts: MacroFactorWorkout[];
  // externalIds the user chose not to save, or took back with Terugzetten:
  // never asked again.
  dismissed: string[];
  // "MacroFactor is leidend voor kracht" (engine/macrofactorLead.ts): on unless
  // the user switched it off.
  leads: boolean;
}

// --- the state --------------------------------------------------------------------

export async function getMacroFactorState(): Promise<MacroFactorState> {
  const stored = await MetaRepo.get<Partial<MacroFactorState>>(STATE_KEY);
  return {
    readAt: stored?.readAt,
    fileName: stored?.fileName,
    workouts: Array.isArray(stored?.workouts) ? stored.workouts : [],
    dismissed: Array.isArray(stored?.dismissed) ? stored.dismissed : [],
    leads: stored?.leads !== false,
  };
}

async function putState(state: MacroFactorState): Promise<void> {
  await MetaRepo.set(STATE_KEY, state);
  notify();
}

// Reads a CSV text and keeps its workouts for the card. Throws a
// MacroFactorFormatError (Dutch message) for a file that is not a Workout Log;
// then nothing is changed.
export async function importMacroFactorText(text: string, fileName?: string, now = new Date()): Promise<{ count: number; skippedRows: number }> {
  return importMacroFactorWorkouts(readMacroFactorCsv(text), fileName, now);
}

// The same for workouts already read from a CSV or an xlsx.
export async function importMacroFactorWorkouts(
  { workouts, skippedRows }: MacroFactorReadResult,
  fileName?: string,
  now = new Date(),
): Promise<{ count: number; skippedRows: number }> {
  const state = await getMacroFactorState();
  await putState({ ...state, workouts, readAt: now.toISOString(), fileName });
  return { count: workouts.length, skippedRows };
}

// "Niet opslaan": remembered, so it is not asked again.
export async function dismissWorkout(externalId: string): Promise<void> {
  const state = await getMacroFactorState();
  if (state.dismissed.includes(externalId)) return;
  await putState({ ...state, dismissed: [...state.dismissed, externalId] });
}

// Several at once (Terugzetten of a list).
export async function dismissWorkouts(externalIds: string[]): Promise<void> {
  const state = await getMacroFactorState();
  const fresh = externalIds.filter((id) => !state.dismissed.includes(id));
  if (fresh.length === 0) return;
  await putState({ ...state, dismissed: [...state.dismissed, ...fresh] });
}

export async function setMacroFactorLeads(on: boolean): Promise<void> {
  const state = await getMacroFactorState();
  if (state.leads === on) return;
  await putState({ ...state, leads: on });
}

export async function clearMacroFactorWorkouts(): Promise<void> {
  const state = await getMacroFactorState();
  await putState({ ...state, workouts: [], readAt: undefined, fileName: undefined });
}

// --- the naming choice --------------------------------------------------------------

export async function getMapping(): Promise<NameMapping> {
  const stored = await MetaRepo.get<NameMapping>(MAPPING_KEY);
  return stored && typeof stored === 'object' ? stored : {};
}

export async function getLoose(): Promise<string[]> {
  const stored = await MetaRepo.get<string[]>(LOOSE_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function putLoose(current: string[], key: string, loose: boolean): Promise<string[]> {
  const without = current.filter((k) => k !== key);
  return loose ? [...without, key] : without;
}

// templateId, or null for "niet inlezen". `loose`: as a loose strength
// training, tied to no planned session (the workouts then become logs without
// a plannedSessionId, the way a training that was not planned is saved).
export async function setMapping(workoutName: string, templateId: string | null, loose = false): Promise<void> {
  await setMappings([{ name: workoutName, templateId, loose }]);
}

// The suggestions the user confirmed with "Koppelingen klopt": one write for
// all of them, so the card does not redraw in between.
export async function setMappings(choices: { name: string; templateId: string | null; loose?: boolean }[]): Promise<void> {
  if (choices.length === 0) return;
  const mapping = { ...(await getMapping()) };
  let loose = await getLoose();
  for (const { name, templateId, loose: isLoose } of choices) {
    mapping[nameKey(name)] = templateId;
    loose = await putLoose(loose, nameKey(name), !!isLoose && templateId !== null);
  }
  await MetaRepo.set(MAPPING_KEY, mapping);
  await MetaRepo.set(LOOSE_KEY, loose);
  notify();
}

export async function forgetMapping(workoutName: string): Promise<void> {
  const mapping = { ...(await getMapping()) };
  delete mapping[nameKey(workoutName)];
  await MetaRepo.set(MAPPING_KEY, mapping);
  await MetaRepo.set(LOOSE_KEY, await putLoose(await getLoose(), nameKey(workoutName), false));
  notify();
}

// --- filling in a log ------------------------------------------------------------------

// Fills only what the stored log has no value for. The log is read again
// here, so a field filled in since the card was drawn is left alone.
// Returns false when there was nothing to fill.
export async function fillInLog(logId: string, workout: MacroFactorWorkout, template: SessionTemplate): Promise<boolean> {
  const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
  if (!log) return false;
  const patch = supplementPatch(log, workout, template);
  if (Object.keys(patch).length === 0) return false;
  await SessionLogsRepo.put({ ...log, ...patch });
  return true;
}

// Adds the reps in reserve and the warm-up sets to a log that came from this
// workout, where those are empty (engine/macrofactorEnrich.ts). Only on the tap
// of the user. Read again here, so what is stored now decides: a second tap on
// a row that was done already adds nothing and says 'already'. 'gone': the log
// is not there any more.
export type EnrichOutcome = 'added' | 'already' | 'gone';
export async function enrichLog(logId: string, workout: MacroFactorWorkout): Promise<EnrichOutcome> {
  const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
  if (!log) return 'gone';
  const strengthData = enrichStrengthData(log, workout);
  if (!strengthData) return 'already';
  await SessionLogsRepo.put({ ...log, strengthData });
  return 'added';
}

// --- a file from "Delen, ASCEND" ---------------------------------------------------------

// The service worker script (public/share-target-sw.js) uses the same two
// names; share-target-sw.test.ts checks that they stay equal.
export const SHARED_CACHE = 'ascend-gedeeld-v1';
export const SHARED_FILE_PATH = 'gedeeld-bestand';
export const SHARED_NAME_HEADER = 'x-bestandsnaam';

// The shared file as bytes (an xlsx is binary and must stay as it came), once:
// it is removed from the cache as it is taken.
export async function takeSharedFile(): Promise<{ data: Uint8Array; name?: string } | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(SHARED_CACHE);
    const request = new URL(`${import.meta.env.BASE_URL}${SHARED_FILE_PATH}`, location.origin).toString();
    const response = await cache.match(request);
    if (!response) return null;
    const data = new Uint8Array(await response.arrayBuffer());
    const raw = response.headers.get(SHARED_NAME_HEADER);
    await cache.delete(request);
    let name: string | undefined;
    try {
      name = raw ? decodeURIComponent(raw) : undefined;
    } catch {
      name = raw ?? undefined;
    }
    return { data, name };
  } catch {
    return null;
  }
}

// --- change signal -----------------------------------------------------------------------

const listeners = new Set<() => void>();
export function onMacroFactorChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify(): void {
  listeners.forEach((l) => l());
}
