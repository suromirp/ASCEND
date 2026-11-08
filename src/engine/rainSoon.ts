// ASCEND: regen in het komende uur, vlak voor een training buiten (docs/beslissingen/2026-11-08-buiten-klein.md).
// Open-Meteo geeft de regen per kwartier (integrations/openMeteo.ts#fetchRainSoon). Eén regel, alleen op
// de dag zelf en alleen als de training binnen twee uur begint: "Over 20 minuten regen; nu gaan of om
// 18:30." Het verandert de planning nooit; het is tekst. Zonder kwartierdata, met oude data of zonder
// dat de regen de training raakt is er niets.
//
// "Nu" wordt gelezen op de klok van de plek (utcOffsetSec van de voorspelling), zoals de kwartieren
// zelf; een telefoon in een andere tijdzone loopt dus niet mee in de war.
//
// Pure: no React, no IndexedDB.

import type { RainSoonForecast } from '../integrations/openMeteo';
import { pad } from '../utils/pad';

const MIN = 60_000;
const DAY = 86_400_000;
const SLOT = 15 * MIN;
// Vanaf 0,1 mm in een kwartier noemen we het regen.
export const RAIN_SLOT_MM = 0.1;
// De training begint binnen twee uur, niet meer dan een uur geleden.
export const RAIN_START_WITHIN_MIN = 120;
export const RAIN_STARTED_AGO_MIN = 60;
// De regen begint binnen een uur: het "komende uur".
export const RAIN_BEGINS_WITHIN_MIN = 60;
// Een kwartierbeeld van meer dan 45 minuten oud zegt niets meer over nu.
export const RAIN_MAX_AGE_MIN = 45;

export interface RainSoonInput {
  forecast: RainSoonForecast | undefined;
  date: string; // de dag van de training
  startMinutes: number; // begintijd in minuten na middernacht, klok van de plek
  durationMinutes: number;
  now: Date;
}

const wallMs = (slotTime: string) => Date.parse(`${slotTime}:00Z`);

function clock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function rainSoonNote(input: RainSoonInput): string | undefined {
  const { forecast, date, startMinutes, durationMinutes, now } = input;
  if (!forecast || forecast.slots.length === 0 || !Number.isFinite(forecast.utcOffsetSec)) return undefined;
  const age = now.getTime() - Date.parse(forecast.fetchedAt);
  if (!Number.isFinite(age) || age > RAIN_MAX_AGE_MIN * MIN || age < -5 * MIN) return undefined;

  const nowWall = now.getTime() + forecast.utcOffsetSec * 1000;
  if (new Date(nowWall).toISOString().slice(0, 10) !== date) return undefined;
  const dayStart = nowWall - (((nowWall % DAY) + DAY) % DAY);
  const nowMin = (nowWall - dayStart) / MIN;
  const toStart = startMinutes - nowMin;
  if (toStart >= RAIN_START_WITHIN_MIN || toStart < -RAIN_STARTED_AGO_MIN) return undefined;

  // Kwartieren vanaf nu; een slot bevat de regen van het kwartier ervoor.
  const slots = forecast.slots
    .map((s) => ({ end: wallMs(s.time), wet: s.mm >= RAIN_SLOT_MM }))
    .filter((s) => Number.isFinite(s.end) && s.end > nowWall)
    .sort((a, b) => a.end - b.end);
  // Het eerste kwartier moet nu omvatten, anders weten we niet wat er nu is.
  if (slots.length === 0 || slots[0].end - SLOT > nowWall) return undefined;

  const first = slots.findIndex((s) => s.wet);
  if (first < 0) return undefined;
  const rainStart = Math.max(nowWall, slots[first].end - SLOT);
  let last = first;
  while (last + 1 < slots.length && slots[last + 1].wet && slots[last + 1].end - slots[last].end === SLOT) last++;
  // Loopt de regen tot het eind van de data, dan weten we niet wanneer het droog wordt.
  const rainEnd = last + 1 < slots.length ? slots[last].end : undefined;

  if (rainStart - nowWall > RAIN_BEGINS_WITHIN_MIN * MIN) return undefined;
  const trainStart = dayStart + Math.max(startMinutes, nowMin) * MIN;
  const trainEnd = trainStart + Math.max(1, durationMinutes) * MIN;
  // De regen moet de training raken: begint voor het einde en is niet al voorbij bij de start.
  if (rainStart >= trainEnd || (rainEnd !== undefined && rainEnd <= trainStart)) return undefined;

  if (rainStart <= nowWall) {
    return rainEnd === undefined ? undefined : `Het regent nu; om ${clock(rainEnd)} is het droog.`;
  }
  const minutes = Math.max(5, Math.ceil((rainStart - nowWall) / (5 * MIN)) * 5);
  return rainEnd === undefined
    ? `Over ${minutes} minuten regen die blijft; nu gaan of een ander moment.`
    : `Over ${minutes} minuten regen; nu gaan of om ${clock(rainEnd)}.`;
}
