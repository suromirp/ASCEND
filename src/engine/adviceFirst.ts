// ASCEND: belangrijk advies als blad bij het openen (I-157, docs/visie/Plek belangrijk advies.md,
// docs/beslissingen/2026-11-26-belangrijk-advies-als-blad.md).
//
// Een kleine vaste klasse voorstellen die de hele week of het plan raken komt bij het openen één keer als eigen blad
// naar voren, met Akkoord, Bekijk en Niet nu. Deze functie kiest welk advies dat is, of niets; de host in App.tsx
// (components/FirstAdviceHost.tsx) tekent het blad. Het advies zelf verandert niet: de kaart op Vandaag blijft staan.
//
// Niet nu is geen antwoord: het raakt `adviceResponses` en engine/learning.ts#declinedRules niet. Het zet de volgende
// keer op de volgende dag, hoogstens drie keer; daarna blijft alleen de kaart. Wat getoond is, staat per advies-id in
// `AppSettings.firstSheet` (`shownOn`, `snoozes`), nooit als vlag op een log.
//
// Pure: no React, no IndexedDB.

import type { Advice } from './adviceShared';
import { dayRules } from './dayRules';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';

// De klasse, op volgorde van belang. Elke nieuwe regel hier is een besluit in docs/beslissingen/. Ziek of vrij voorbij
// staat er niet in: daar is geen eigen herplanvoorstel voor; de terugkeer na een pauze is REENTRY.
export const FIRST_SHEET_RULES: readonly string[] = ['REENTRY', 'NO-GOAL-WAVES', 'BEGINNER-LADDER'];

// Hoe vaak Niet nu kan; daarna alleen de kaart. Vast, geen instelling (de eigenaar vroeg om één keer).
export const FIRST_SHEET_MAX_SNOOZES = 3;
// Hoeveel advies-ids de map onthoudt; de oudste valt eraf.
export const FIRST_SHEET_MAX_IDS = 40;

export interface FirstSheetMemory {
  shownOn: string;
  snoozes: number;
}
export type FirstSheetMap = Record<string, FirstSheetMemory>;

// Plaats in de klasse; buiten de klasse komt na alles erin.
export function firstSheetRank(ruleId: string): number {
  const i = FIRST_SHEET_RULES.indexOf(ruleId);
  return i < 0 ? FIRST_SHEET_RULES.length : i;
}

// Mag dit advies vandaag als blad? Nog nooit getoond: ja. Getoond en daarna Niet nu: de volgende dag weer, tot drie
// keer Niet nu. Getoond zonder Niet nu (Akkoord, Bekijk, of het blad bleef liggen): niet meer.
export function mayShowFirstSheet(memory: FirstSheetMap | undefined, id: string, today: string): boolean {
  const m = memory?.[id];
  if (!m) return true;
  return m.snoozes >= 1 && m.snoozes < FIRST_SHEET_MAX_SNOOZES && m.shownOn < today;
}

export interface FirstSheetState {
  // De instelling "Belangrijk advies als blad" (absent is aan).
  on: boolean;
  today: string;
  memory?: FirstSheetMap;
  // Een programma of planning: zonder (een lege app, StartWelcome) geen blad.
  hasPlan: boolean;
  // Een lopende training (Forge open, de pil, een open verzoek) of een open concept.
  trainingOpen: boolean;
  draftOpen: boolean;
  // Een ander blad of moment staat al in de rij (state/sheetRow.ts).
  otherSheetOpen: boolean;
  // Een vakantie, tocht of ziekte die vandaag nog loopt.
  paused: boolean;
}

// Het ene advies voor het blad, of niets. Werkt op de samengestelde lijst van state/adviceAndWeek.ts (ook de golven en
// de ladder, die niet uit computeAdvice komen). Een advies dat wacht op een ander (`blockedBy`) komt nooit als blad.
export function firstSheetAdvice(advice: readonly Advice[], state: FirstSheetState): Advice | undefined {
  if (!state.on || !state.hasPlan || state.trainingOpen || state.draftOpen || state.otherSheetOpen || state.paused) return undefined;
  return advice
    .filter((a) => FIRST_SHEET_RULES.includes(a.ruleId) && !a.blockedBy && mayShowFirstSheet(state.memory, a.id, state.today))
    .sort((a, b) => firstSheetRank(a.ruleId) - firstSheetRank(b.ruleId) || b.priority - a.priority || a.id.localeCompare(b.id))[0];
}

// Loopt er vandaag een vakantie, tocht of ziekte? Dan geen blad (engine/dayRules.ts, niet zelf de ziekte lezen).
export function pausedToday(today: string, leave: readonly LeavePeriod[] | undefined, illness: readonly IllnessEpisode[] | undefined): boolean {
  return dayRules({ today, leave, illness }).holds(today, 'ill', 'ill_light', 'off', 'trek');
}

// Hoe lang het blad na het opstarten wacht, zodat de bladen die bij het opstarten horen (de welkomstvraag) zich
// eerst melden in de rij (state/sheetRow.ts).
export const FIRST_SHEET_SETTLE_MS = 1500;

// Het blad staat er: onthoud de dag, Niet nu blijft geteld.
export function rememberFirstSheetShown(memory: FirstSheetMap | undefined, id: string, today: string): FirstSheetMap {
  return trimMemory({ ...memory, [id]: { shownOn: today, snoozes: memory?.[id]?.snoozes ?? 0 } });
}

// Niet nu: een keer meer uitgesteld. De dag blijft die van het tonen, dus morgen pas weer.
export function rememberFirstSheetNotNow(memory: FirstSheetMap | undefined, id: string, today: string): FirstSheetMap {
  const was = memory?.[id];
  return trimMemory({ ...memory, [id]: { shownOn: was?.shownOn ?? today, snoozes: Math.min(FIRST_SHEET_MAX_SNOOZES, (was?.snoozes ?? 0) + 1) } });
}

function trimMemory(memory: FirstSheetMap): FirstSheetMap {
  const entries = Object.entries(memory);
  if (entries.length <= FIRST_SHEET_MAX_IDS) return memory;
  return Object.fromEntries(entries.sort((a, b) => b[1].shownOn.localeCompare(a[1].shownOn) || a[0].localeCompare(b[0])).slice(0, FIRST_SHEET_MAX_IDS));
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Defensief lezen, ook voor een import (storage/migrations.ts#migrateFirstSheet): een kapotte regel valt weg en telt
// mee in `skipped`. Afwezig is undefined: dan blijft wat op het toestel staat.
export function readFirstSheet(raw: unknown): { value: FirstSheetMap | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { value: undefined, skipped: 0 };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { value: undefined, skipped: 1 };
  const value: FirstSheetMap = {};
  let skipped = 0;
  for (const [id, item] of Object.entries(raw as Record<string, unknown>)) {
    const r = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined;
    const snoozes = r?.snoozes;
    if (!r || id.length === 0 || id.length > 200 || typeof r.shownOn !== 'string' || !ISO_DAY.test(r.shownOn)
      || typeof snoozes !== 'number' || !Number.isInteger(snoozes) || snoozes < 0 || snoozes > FIRST_SHEET_MAX_SNOOZES) {
      skipped++;
      continue;
    }
    value[id] = { shownOn: r.shownOn, snoozes };
  }
  return { value: trimMemory(value), skipped };
}

// Samenvoegen bij het terugzetten van een back-up: per id de verste stand (de laatste dag, de meeste keren Niet nu),
// zodat een blad dat op een toestel al getoond is niet terugkomt.
export function mergeFirstSheet(current: FirstSheetMap | undefined, incoming: FirstSheetMap | undefined): FirstSheetMap | undefined {
  if (!current && !incoming) return undefined;
  const out: FirstSheetMap = { ...incoming };
  for (const [id, m] of Object.entries(current ?? {})) {
    const theirs = out[id];
    out[id] = theirs ? { shownOn: m.shownOn > theirs.shownOn ? m.shownOn : theirs.shownOn, snoozes: Math.max(m.snoozes, theirs.snoozes) } : m;
  }
  return trimMemory(out);
}

// Akkoord in het blad wacht hoogstens zo lang op de planningsronde; daarna zegt het blad dat het langer duurt.
export const FIRST_SHEET_TIMEOUT_MS = 15_000;
export const FIRST_SHEET_FAILED_NOTE = 'Het lukte niet om je planning nu bij te werken. Er is niets aangepast; probeer het zo nog eens.';
export const FIRST_SHEET_DONE_NOTE = 'Opgeslagen.';
/** Bekijk liep vast of te lang: er is niets aangepast en het voorstel staat nog op Vandaag. */
export const FIRST_SHEET_VIEW_FAILED_NOTE = 'Het voorstel openen lukte niet. Er is niets aangepast; je vindt het ook op Vandaag.';
export const FIRST_SHEET_SLOW_NOTE = 'Dit duurt langer dan normaal. Zodra het klaar is, zie je onderin wat er veranderde, met ongedaan maken.';
