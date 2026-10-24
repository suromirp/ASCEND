// ASCEND: de instelling "Lucht bovenaan" (docs/beslissingen/2026-10-24-nachtlucht.md).
// De lichte lucht bovenaan een tab is 's avonds en 's nachts een fel vlak; deze
// instelling kiest tussen de lichte en de donkere lucht, op tijd of vast.
// Optioneel en zonder migratie: ontbreekt een sleutel of staat er iets geks, dan
// geldt het advies: op tijd en met de zon, dus donker na zonsondergang en weer
// licht bij zonsopkomst op je plek (engine/sun.ts; zonder plaats het midden van
// Nederland). Een vaste begintijd wordt om 07:00 weer licht.

import { sunPlace, sunTimes, type SunTimes } from './sun';

export type SkySetting = 'auto' | 'day' | 'night';
export type SkyMode = 'day' | 'night';

export const SKY_SETTINGS: SkySetting[] = ['auto', 'day', 'night'];
export const DEFAULT_SKY: SkySetting = 'auto';

export const SKY_NIGHT_FROM_CHOICES = ['zon', '19:00', '20:00', '21:00', '22:00'] as const;
export type SkyNightFrom = (typeof SKY_NIGHT_FROM_CHOICES)[number];
export const DEFAULT_SKY_NIGHT_FROM: SkyNightFrom = 'zon';
// Vanaf dit uur is het weer licht.
export const SKY_DAY_FROM_MINUTES = 7 * 60;

export interface SkyConfig {
  sky: SkySetting;
  nightFrom: SkyNightFrom;
}

export function resolveSky(raw: { sky?: unknown; skyNightFrom?: unknown } | undefined): SkyConfig {
  return {
    sky: SKY_SETTINGS.find((s) => s === raw?.sky) ?? DEFAULT_SKY,
    nightFrom: SKY_NIGHT_FROM_CHOICES.find((s) => s === raw?.skyNightFrom) ?? DEFAULT_SKY_NIGHT_FROM,
  };
}

function minutesOf(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

// Welke lucht hoort er op dit moment bij? Puur: de klok komt van `date`, de plek
// van `homeLocation` (voor "met de zon").
export function skyModeAt(raw: { sky?: unknown; skyNightFrom?: unknown; homeLocation?: unknown } | undefined, date: Date): SkyMode {
  const { sky, nightFrom } = resolveSky(raw);
  if (sky === 'day') return 'day';
  if (sky === 'night') return 'night';
  const now = date.getHours() * 60 + date.getMinutes();
  if (nightFrom === 'zon') {
    const sun = sunToday(raw?.homeLocation, date);
    if (sun) return now >= sun.sunset || now < sun.sunrise ? 'night' : 'day';
  }
  const from = nightFrom === 'zon' ? minutesOf(FALLBACK_NIGHT_FROM) : minutesOf(nightFrom);
  return now >= from || now < SKY_DAY_FROM_MINUTES ? 'night' : 'day';
}

// Without a sunset (far north or south) "met de zon" falls back to the old advice.
const FALLBACK_NIGHT_FROM = '20:00';

// Today's sun at the place, in local minutes; the date's own UTC offset, so
// summer and winter time are right.
export function sunToday(homeLocation: unknown, date: Date): SunTimes | undefined {
  const { lat, lon } = sunPlace(homeLocation);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return sunTimes(iso, lat, lon, -date.getTimezoneOffset());
}
