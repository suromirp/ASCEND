// ASCEND: de wind bepaalt de draairichting van een lus (besluit 2026-11-22-wind-en-lus.md). Je begint tegen de
// wind in en hebt hem op de terugweg mee. De wind komt uit het weer dat de app al heeft (de voorspelling van
// Open-Meteo, op het uur van de start); er gaat niets nieuws de deur uit. Is er geen wind bekend of is hij
// zwak (onder ongeveer 3 Beaufort, 12 km/u), dan verandert er niets. Alles hier is puur en deterministisch;
// de lus zelf blijft dezelfde punten, alleen in de andere volgorde (reverseProposal, geen aanroep).

import type { RoutePoint, RouteProposal } from '../models/route';
import type { WeatherForecast } from '../models/weather';
import { pad } from '../utils/pad';
import { canReverse, reverseProposal } from './routeAdjust';
import { bearing, cumulative } from './routeGeometry';

// Onder deze wind (km/u) doet de app niets: 3 Beaufort begint bij 12 km/u.
export const WIND_MIN_KMH = 12;
// Vanaf zoveel zegt de regel "tegen de wind in" of "met de wind mee": de gemiddelde cosinus van de hoek tussen
// je looprichting en de wind (1 is recht tegen, 0 is dwars).
export const WIND_CLEAR = 0.3;

export interface LoopWind {
  // Waar de wind vandaan komt, in graden (0 is noord, 90 oost).
  fromDeg: number;
  kmh: number;
}

const COMPASS = ['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest'];
export const windWord = (deg: number): string => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

// De wind op het uur van de start, uit de voorspelling die er al is. `startHour` is het uur waarop je meestal
// begint; zonder uur (een wandeling die je zelf plant) is het nu. Geen voorspelling, geen richting in dat uur
// (een voorspelling van voor dit veld) of een uur dat er niet in staat: undefined.
export function windForStart(forecast: WeatherForecast | undefined, date: string, startHour: number | undefined, now: Date): LoopWind | undefined {
  if (!forecast) return undefined;
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const hour = startHour ?? (date === today ? now.getHours() : undefined);
  if (hour === undefined) return undefined;
  const at = forecast.hours.find((h) => h.time === `${date}T${pad(hour)}:00`);
  if (!at || at.windDirDeg === undefined || !Number.isFinite(at.windDirDeg) || !Number.isFinite(at.windKmh)) return undefined;
  return { fromDeg: at.windDirDeg, kmh: at.windKmh };
}

const RAD = Math.PI / 180;

// Gemiddelde cosinus tussen je looprichting en de richting waar de wind vandaan komt, over het eerste en het
// laatste derde van de lus (naar afstand). 1 is recht tegen de wind in, -1 recht met de wind mee.
// Een derde en geen helft: bij een rondje is de wind over de eerste helft in beide richtingen hetzelfde (de
// helft eindigt op hetzelfde verste punt, dus dezelfde verplaatsing), alleen het begin en het eind verschillen.
export function windEnds(points: readonly RoutePoint[], fromDeg: number): { start: number; end: number } | undefined {
  if (points.length < 2) return undefined;
  const cum = cumulative([...points]);
  const total = cum[cum.length - 1];
  if (!(total > 0)) return undefined;
  const third = total / 3;
  let a = 0;
  let aLen = 0;
  let b = 0;
  let bLen = 0;
  for (let i = 1; i < points.length; i++) {
    const len = cum[i] - cum[i - 1];
    if (!(len > 0)) continue;
    const cos = Math.cos((bearing(points[i - 1], points[i]) - fromDeg) * RAD);
    // Een stuk over de grens van een derde telt naar rato mee.
    const inStart = Math.max(0, Math.min(cum[i], third) - cum[i - 1]);
    const inEnd = Math.max(0, cum[i] - Math.max(cum[i - 1], total - third));
    a += cos * inStart;
    aLen += inStart;
    b += cos * inEnd;
    bLen += inEnd;
  }
  if (!(aLen > 0) || !(bLen > 0)) return undefined;
  return { start: a / aLen, end: b / bLen };
}

const windMakes = (w: LoopWind | undefined): w is LoopWind => !!w && w.kmh >= WIND_MIN_KMH;

// De lus in de richting waarin het eerste derde het meest tegen de wind in loopt. Zwakke of onbekende wind, of een
// lus die heen en terug over hetzelfde pad gaat (Simpel): dezelfde lus terug. Bij gelijke stand blijft de lus zoals hij is.
export function orientByWind(p: RouteProposal, wind: LoopWind | undefined): RouteProposal {
  if (!windMakes(wind) || !canReverse(p)) return p;
  const here = windEnds(p.points, wind.fromDeg);
  const back = windEnds([...p.points].reverse(), wind.fromDeg);
  if (!here || !back) return p;
  return back.start > here.start + 1e-6 ? reverseProposal(p) : p;
}

// De ene regel bij de lus, over de lus zoals hij nu staat (ook na Andersom). Leeg als de wind niets zegt.
export function windLine(p: RouteProposal, wind: LoopWind | undefined): string {
  if (!windMakes(wind) || !canReverse(p)) return '';
  const ends = windEnds(p.points, wind.fromDeg);
  if (!ends) return '';
  const what = `${windWord(wind.fromDeg)}, ${Math.round(wind.kmh)} km/u`;
  if (ends.start >= WIND_CLEAR) {
    return ends.end <= -WIND_CLEAR ? `Je begint tegen de wind in (${what}) en hebt hem op de terugweg mee.` : `Je begint tegen de wind in (${what}).`;
  }
  if (ends.start <= -WIND_CLEAR) {
    return ends.end >= WIND_CLEAR ? `Je begint met de wind mee (${what}) en loopt de terugweg ertegenin.` : `Je begint met de wind mee (${what}).`;
  }
  return `De wind (${what}) staat dwars op deze lus.`;
}
