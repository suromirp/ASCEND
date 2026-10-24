// ASCEND: zonsopkomst en zonsondergang voor een plek en een dag, uitgerekend en
// niet opgehaald, zodat het ook zonder internet en zonder voorspelling werkt.
// De formule is die van de NOAA (de vereenvoudigde zonnestand met de
// tijdvereffening en de declinatie per dag), nauwkeurig op een paar minuten;
// genoeg om de lucht bovenaan op tijd donker te laten worden.
//
// Pure: no React, no IndexedDB.

const RAD = Math.PI / 180;

// The centre of the Netherlands: the sun when no place is chosen yet. Not a
// person's place, only a sensible middle for a Dutch app.
export const FALLBACK_PLACE = { lat: 52.13, lon: 5.29 };

export interface SunTimes {
  // Minutes after local midnight.
  sunrise: number;
  sunset: number;
}

// A day without a sunrise or sunset, far north or south: the sun stays up all
// day, or never comes up.
export type PolarDay = 'always-day' | 'always-night';

// `utcOffsetMinutes` is east of UTC (Amsterdam in summer: 120). Undefined on a
// day without a sunrise or sunset (far north or south); sunDay says which.
export function sunTimes(dateIso: string, lat: number, lon: number, utcOffsetMinutes: number): SunTimes | undefined {
  const day = sunDay(dateIso, lat, lon, utcOffsetMinutes);
  return typeof day === 'string' ? undefined : day;
}

// Note: after a late sunset the local time can pass midnight, so `sunset` may be
// smaller than `sunrise` (a short northern summer night); read it with isNightAt.
export function sunDay(dateIso: string, lat: number, lon: number, utcOffsetMinutes: number): SunTimes | PolarDay {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const cosHa = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) - Math.tan(lat * RAD) * Math.tan(decl);
  if (cosHa > 1) return 'always-night';
  if (cosHa < -1) return 'always-day';
  const ha = Math.acos(cosHa) / RAD;
  const sunriseUtc = 720 - 4 * (lon + ha) - eqTime;
  const sunsetUtc = 720 - 4 * (lon - ha) - eqTime;
  const wrap = (min: number) => ((Math.round(min + utcOffsetMinutes) % 1440) + 1440) % 1440;
  return { sunrise: wrap(sunriseUtc), sunset: wrap(sunsetUtc) };
}

// The place from AppSettings.homeLocation when it has coordinates, else the fallback.
export function sunPlace(raw: unknown): { lat: number; lon: number } {
  const p = raw as { lat?: unknown; lon?: unknown } | undefined;
  return typeof p?.lat === 'number' && typeof p?.lon === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lon)
    ? { lat: p.lat, lon: p.lon }
    : FALLBACK_PLACE;
}

// Is it dark at `minute` (minutes after local midnight)? Also right when the
// sunset falls after midnight, as on a summer night far north.
export function isNightAt(day: SunTimes | PolarDay, minute: number): boolean {
  if (day === 'always-night') return true;
  if (day === 'always-day') return false;
  return day.sunset >= day.sunrise
    ? minute >= day.sunset || minute < day.sunrise
    : minute >= day.sunset && minute < day.sunrise;
}
