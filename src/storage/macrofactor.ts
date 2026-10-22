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
import { readMacroFactorCsv, nameKey, type MacroFactorWorkout } from '../engine/macrofactorImport';
import { supplementPatch, type NameMapping } from '../engine/macrofactorLink';
import type { SessionTemplate } from '../models/training';

const STATE_KEY = 'macrofactorWorkouts';
const MAPPING_KEY = 'macrofactorMapping';

export interface MacroFactorState {
  // When the file was read (ISO timestamp) and what it was called.
  readAt?: string;
  fileName?: string;
  workouts: MacroFactorWorkout[];
  // externalIds the user chose not to save: never asked again.
  dismissed: string[];
}

// --- the state --------------------------------------------------------------------

export async function getMacroFactorState(): Promise<MacroFactorState> {
  const stored = await MetaRepo.get<Partial<MacroFactorState>>(STATE_KEY);
  return {
    readAt: stored?.readAt,
    fileName: stored?.fileName,
    workouts: Array.isArray(stored?.workouts) ? stored.workouts : [],
    dismissed: Array.isArray(stored?.dismissed) ? stored.dismissed : [],
  };
}

async function putState(state: MacroFactorState): Promise<void> {
  await MetaRepo.set(STATE_KEY, state);
  notify();
}

// Reads a file's text and keeps its workouts for the card. Throws a
// MacroFactorFormatError (Dutch message) for a file that is not a Workout Log;
// then nothing is changed.
export async function importMacroFactorText(text: string, fileName?: string, now = new Date()): Promise<{ count: number; skippedRows: number }> {
  const { workouts, skippedRows } = readMacroFactorCsv(text);
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

export async function clearMacroFactorWorkouts(): Promise<void> {
  const state = await getMacroFactorState();
  await putState({ ...state, workouts: [], readAt: undefined, fileName: undefined });
}

// --- the naming choice --------------------------------------------------------------

export async function getMapping(): Promise<NameMapping> {
  const stored = await MetaRepo.get<NameMapping>(MAPPING_KEY);
  return stored && typeof stored === 'object' ? stored : {};
}

// templateId, or null for "niet inlezen".
export async function setMapping(workoutName: string, templateId: string | null): Promise<void> {
  const mapping = await getMapping();
  await MetaRepo.set(MAPPING_KEY, { ...mapping, [nameKey(workoutName)]: templateId });
  notify();
}

export async function forgetMapping(workoutName: string): Promise<void> {
  const mapping = { ...(await getMapping()) };
  delete mapping[nameKey(workoutName)];
  await MetaRepo.set(MAPPING_KEY, mapping);
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

// --- a file from "Delen, ASCEND" ---------------------------------------------------------

// The service worker script (public/share-target-sw.js) uses the same two
// names; share-target-sw.test.ts checks that they stay equal.
export const SHARED_CACHE = 'ascend-gedeeld-v1';
export const SHARED_FILE_PATH = 'gedeeld-bestand';
export const SHARED_NAME_HEADER = 'x-bestandsnaam';

// The shared file, once: it is removed from the cache as it is taken.
export async function takeSharedFile(): Promise<{ text: string; name?: string } | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(SHARED_CACHE);
    const request = new URL(`${import.meta.env.BASE_URL}${SHARED_FILE_PATH}`, location.origin).toString();
    const response = await cache.match(request);
    if (!response) return null;
    const text = await response.text();
    const raw = response.headers.get(SHARED_NAME_HEADER);
    await cache.delete(request);
    let name: string | undefined;
    try {
      name = raw ? decodeURIComponent(raw) : undefined;
    } catch {
      name = raw ?? undefined;
    }
    return { text, name };
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
