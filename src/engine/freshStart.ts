// ASCEND — "started from scratch on this device?"
//
// A wiped browser or a reinstalled home-screen app leaves an empty
// database, and ASCEND quietly seeds the default program again. For the
// first days after that, Today offers to put a backup back, until there is
// something of your own (a log, a backup) or you choose to start fresh.
//
// Pure: no React, no IndexedDB.

import { daysBetween } from '../utils/dates';

export const FRESH_START_DAYS = 14;

export function shouldOfferRestore(input: {
  seededAt: string | undefined;
  today: string;
  logCount: number;
  lastExportedAt?: string;
  dismissedAt?: string;
}): boolean {
  const { seededAt, today, logCount, lastExportedAt, dismissedAt } = input;
  if (!seededAt || dismissedAt || lastExportedAt || logCount > 0) return false;
  return daysBetween(seededAt.slice(0, 10), today) < FRESH_START_DAYS;
}

// --- an empty app: nothing chosen, nothing done ----------------------------
//
// A new install used to be filled with the default program, with a goal and a
// full planning nobody asked for. Now it stays empty until you say what you
// want (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md). "Empty" is
// derived from the data itself, never from a flag that can drift: no program,
// nothing planned, nothing logged and no goal. Whatever you or a backup put in
// makes it not empty, so an existing installation can never end up here.

export interface StartFacts {
  programs: number;
  plannedSessions: number;
  sessionLogs: number;
  trainingGoals: number;
}

export function isEmptyStart(facts: StartFacts): boolean {
  return facts.programs === 0 && facts.plannedSessions === 0 && facts.sessionLogs === 0 && facts.trainingGoals === 0;
}

// Does Vandaag have to ask first? Without a program ASCEND has nothing to plan
// on, and with nothing planned there is no week to show. That is the moment for
// the welcome and the questions, whatever else is on the device (a goal set by
// hand on Ascend, a training logged on its own): the questions then only add
// what is missing. Never true for an installation that has a program.
export function needsFirstPlan(facts: Pick<StartFacts, 'programs' | 'plannedSessions'>): boolean {
  return facts.programs === 0 && facts.plannedSessions === 0;
}

// The sentences of the restore summary that depend on what is on the device.
// With nothing on the device there is nothing to lose and nothing to keep a
// copy of: the summary then says what comes in, with no warning about removal.
export function restoreSafetyLines(deviceEmpty: boolean): string[] {
  if (deviceEmpty) return ['Er staat nog niets op dit toestel. Alles uit je back-up komt erbij.'];
  return [
    'Vlak voor het importeren bewaart ASCEND een kopie van je huidige gegevens. Daarmee kun je de import ongedaan maken.',
    'Trainingen worden bij importeren nooit verwijderd.',
  ];
}
