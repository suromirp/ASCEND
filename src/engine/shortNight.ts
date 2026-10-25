// ASCEND: een nacht die twijfelachtig kort is (docs/beslissingen/2026-10-25-korte-
// nacht-vragen.md). Gaat het horloge 's nachts van je pols, dan meet Garmin maar een
// deel van de nacht en geeft dat niet door. ASCEND beslist dan niet zelf dat je slecht
// sliep: het vraagt het, en bewaart alleen jouw oordeel per datum. De getallen uit
// intervals.icu en van het horloge blijven zoals ze zijn.
//
// Puur: geen React, geen IndexedDB.

import type { NightJudgment } from '../models/checkIn';

// Onder 4 uur is een nacht altijd twijfelachtig; daarnaast onder de helft van je eigen
// gemiddelde, als dat uit minstens 7 dagen komt (dezelfde ondergrens als
// MIN_BASELINE_DAYS in wellnessCheck.ts).
export const DOUBTFUL_SLEEP_MINUTES = 240;
export const MIN_OWN_DAYS = 7;
export const MAX_JUDGMENTS = 120;

// De uren die je kunt kiezen als je zelf schat.
export const HOUR_CHOICES = [5, 6, 7, 8, 9];

export function isDoubtfulShortNight(minutes: number, ownMinutes: number[]): boolean {
  if (minutes < DOUBTFUL_SLEEP_MINUTES) return true;
  if (ownMinutes.length < MIN_OWN_DAYS) return false;
  const avg = ownMinutes.reduce((a, b) => a + b, 0) / ownMinutes.length;
  return minutes < avg / 2;
}

// "3 u 10", "3 u", "45 min".
export function shortSleepLabel(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} u` : `${h} u ${m}`;
}

export function nightQuestionText(minutes: number): string {
  return `Je horloge zag maar ${shortSleepLabel(minutes)} slaap. Klopt dat?`;
}

// Waar deze ochtend staat met de korte nacht: nog te vragen, bevestigd of genegeerd.
export interface NightInfo {
  state: 'ask' | 'klopt' | 'ignored';
  minutes: number;
  hours?: number;
  hoursSkipped?: boolean;
}

export function nightInfo(minutes: number | undefined, ownMinutes: number[], judgment: NightJudgment | undefined): NightInfo | undefined {
  if (minutes === undefined) return undefined;
  if (judgment?.verdict === 'klopt') return { state: 'klopt', minutes };
  if (judgment?.verdict === 'niet_goed') return { state: 'ignored', minutes, hours: judgment.hours, hoursSkipped: judgment.hoursSkipped };
  return isDoubtfulShortNight(minutes, ownMinutes) ? { state: 'ask', minutes } : undefined;
}

export function judgmentFor(date: string, judgments: NightJudgment[] | undefined): NightJudgment | undefined {
  return (judgments ?? []).find((j) => j.date === date);
}

// De datums waarvan slaapduur, slaapscore en HRV niet meetellen in je gemiddelden.
export function ignoredNightDates(judgments: NightJudgment[] | undefined): ReadonlySet<string> {
  return new Set((judgments ?? []).filter((j) => j.verdict === 'niet_goed').map((j) => j.date));
}

export function upsertJudgment(list: NightJudgment[] | undefined, judgment: NightJudgment): NightJudgment[] {
  return [...(list ?? []).filter((j) => j.date !== judgment.date), judgment].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_JUDGMENTS);
}

export function removeJudgment(list: NightJudgment[] | undefined, date: string): NightJudgment[] {
  return (list ?? []).filter((j) => j.date !== date);
}

export interface NightOptions {
  // "Vragen bij een korte nacht" staat aan. Zonder opties werkt alles zoals voorheen.
  ask?: boolean;
  judgments?: NightJudgment[];
}
