// ASCEND: het lawinegevaar bij een tocht in de sneeuw (docs/beslissingen/2026-11-09-gr5-waarschuwingen.md).
//
// Alleen als een tocht in de bergen of de sneeuw in het sneeuwseizoen valt (november tot en met mei,
// of altijd bij terrein sneeuw) en er een plek voor de tocht bekend is; anders niets. Dezelfde dagen
// als het bergweer: op een dag van de tocht, of de dag ervoor als de tocht een eigen plek heeft.
// Welk waarschuwingsgebied van de EAWS bij die plek hoort, rekent ASCEND op het toestel uit met de
// gebieden van de dienst (integrations/eaws.ts); het bulletin zelf is een getal van 1 tot 5 per gebied.
// Eén regel met het droge feit eerst: "Lawinegevaar aanzienlijk, 3 van 5, morgen rond Col du Test."
// Geen oordeel of je moet gaan, en de planning verandert er nooit door.
//
// Puur: geen React, geen IndexedDB.

import type { LeavePeriod } from '../models/leave';
import type { WeatherPlace } from '../models/weather';
import type { AvalancheRegion } from '../integrations/eaws';
import { addDays } from '../utils/dates';
import { isMyLocation } from './weatherLocation';

export const SNOW_MONTHS: readonly number[] = [11, 12, 1, 2, 3, 4, 5];

// De bestanden met gebieden die ASCEND kent, met hun grootte in kB en hun grenzen [west, zuid, oost,
// noord] (gemeten op 9 november 2026). De Alpen en de Pyreneeën; Scandinavië en heel Spanje zijn te groot om op een
// telefoon op te halen.
export const AVALANCHE_FILES: readonly { file: string; kb: number; bbox: readonly [number, number, number, number] }[] = [
  { file: 'FR', kb: 84, bbox: [-1.31, 41.7, 9.28, 46.4] },
  { file: 'CH', kb: 156, bbox: [5.95, 45.82, 10.49, 47.81] },
  { file: 'AD', kb: 23, bbox: [1.41, 42.44, 1.78, 42.66] },
  { file: 'ES-AR', kb: 88, bbox: [-0.86, 42.39, 0.77, 42.93] },
  { file: 'ES-CT-L', kb: 54, bbox: [0.64, 42.59, 1.04, 42.86] },
  { file: 'ES-CT', kb: 72, bbox: [0.71, 42.12, 2.41, 42.79] },
  { file: 'IT-21', kb: 371, bbox: [6.63, 44.06, 8.7, 46.46] },
  { file: 'IT-23', kb: 137, bbox: [6.8, 45.47, 7.94, 45.99] },
  { file: 'IT-25', kb: 491, bbox: [8.59, 44.68, 10.83, 46.63] },
  { file: 'IT-32-BZ', kb: 321, bbox: [10.38, 46.22, 12.48, 47.09] },
  { file: 'IT-32-TN', kb: 150, bbox: [10.45, 45.67, 11.96, 46.53] },
  { file: 'IT-34', kb: 62, bbox: [10.71, 45.53, 12.73, 46.68] },
  { file: 'IT-36', kb: 318, bbox: [12.32, 45.98, 13.72, 46.65] },
  { file: 'AT-02', kb: 410, bbox: [12.66, 46.37, 15.07, 47.13] },
  { file: 'AT-03', kb: 77, bbox: [14.47, 47.42, 16.37, 48.17] },
  { file: 'AT-04', kb: 52, bbox: [13.44, 47.46, 14.77, 48.03] },
  { file: 'AT-05', kb: 144, bbox: [12.08, 46.94, 14.0, 47.83] },
  { file: 'AT-06', kb: 285, bbox: [13.56, 46.64, 16.17, 47.83] },
  { file: 'AT-07', kb: 514, bbox: [10.1, 46.65, 12.96, 47.74] },
  { file: 'AT-08', kb: 72, bbox: [9.53, 46.84, 10.24, 47.6] },
  { file: 'DE-BY', kb: 79, bbox: [9.97, 47.27, 13.1, 47.83] },
  { file: 'SI', kb: 59, bbox: [13.38, 45.42, 16.08, 46.66] },
];
// Hoogstens zoveel bestanden per plek: meer is te veel verkeer voor één regel. Bij de Mont Blanc
// liggen de grenzen van vier diensten over elkaar.
export const MAX_FILES = 4;

export interface AvalancheTarget {
  date: string;
  when: 'vandaag' | 'morgen';
  place: WeatherPlace;
}

const inSeason = (date: string, terrain: string) => terrain === 'snow' || SNOW_MONTHS.includes(Number(date.slice(5, 7)));

// De dag en de plek waarvoor het bulletin telt, of undefined.
export function avalancheTarget(periods: readonly LeavePeriod[] | undefined, today: string, weatherPlace: WeatherPlace | undefined, followsLocation: boolean): AvalancheTarget | undefined {
  const treks = (periods ?? []).filter((p) => p.kind === 'trek' && !!p.trek && (p.trek.terrain === 'mountain' || p.trek.terrain === 'snow'));
  for (const p of treks) {
    if (p.startDate > today || today > p.endDate || !inSeason(today, p.trek!.terrain)) continue;
    const place = p.trek!.place ?? (followsLocation ? weatherPlace : undefined);
    if (place) return { date: today, when: 'vandaag', place };
  }
  const tomorrow = addDays(today, 1);
  for (const p of treks) {
    if (p.startDate === tomorrow && p.trek!.place && inSeason(tomorrow, p.trek!.terrain)) return { date: tomorrow, when: 'morgen', place: p.trek!.place };
  }
  return undefined;
}

// Welke bestanden de plek kunnen bevatten, het lichtste eerst: zo kost een plek zo weinig verkeer
// als het kan.
export function regionFilesAt(lat: number, lon: number): string[] {
  return AVALANCHE_FILES.filter(({ bbox: b }) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3])
    .sort((a, b) => a.kb - b.kb)
    .slice(0, MAX_FILES)
    .map((f) => f.file);
}

function inRing(ring: number[][], lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Het gebied waarin de plek ligt op die dag, of undefined. Een gebied met een einddatum ervoor of
// een begindatum erna telt niet (de diensten passen hun indeling soms aan).
export function regionAt(regions: readonly AvalancheRegion[], lat: number, lon: number, date: string): string | undefined {
  for (const r of regions) {
    if ((r.startDate && r.startDate > date) || (r.endDate && r.endDate <= date)) continue;
    for (const [outer, ...holes] of r.polygons) {
      if (inRing(outer, lon, lat) && !holes.some((h) => inRing(h, lon, lat))) return r.id;
    }
  }
  return undefined;
}

const WORDS = ['', 'gering', 'matig', 'aanzienlijk', 'groot', 'zeer groot'] as const;

export function dangerWord(level: number): string | undefined {
  return Number.isInteger(level) && level >= 1 && level <= 5 ? WORDS[level] : undefined;
}

// "Lawinegevaar aanzienlijk, 3 van 5, morgen rond Col du Test." Undefined zonder bulletin.
export function avalancheLine(level: number | undefined, target: AvalancheTarget): string | undefined {
  const word = level === undefined ? undefined : dangerWord(level);
  if (!word) return undefined;
  const name = target.place.name.trim();
  const where = !name || isMyLocation(target.place) ? 'op je plek' : `rond ${name}`;
  return `Lawinegevaar ${word}, ${level} van 5, ${target.when === 'morgen' ? 'morgen ' : 'vandaag '}${where}.`;
}

// Geen bulletin gevonden bij een tocht in het sneeuwseizoen (fout, niet gevonden of onbekend gebied):
// zeg dat, zodat stilte nooit klinkt als "veilig". Alleen tekst; de plek staat in de kaart zelf.
export const AVALANCHE_MISSING_LINE = 'Geen lawinebulletin gevonden voor je tocht. Kijk bij de lawinedienst.';
